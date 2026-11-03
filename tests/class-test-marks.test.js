import test from "node:test";
import assert from "node:assert/strict";
import {
  validateMarksInput,
  isTeacherAuthorizedForClass,
  createClassTest,
  saveClassTestScores,
  publishClassTest,
  getStudentPublishedMarks,
  getClassTestsForTeacher,
} from "../src/utils/classTestMarksService.js";

// Mock localStorage for headless Node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
globalThis.window = {
  dispatchEvent: () => true,
};

test("Class Test Marks & Student Marks Portal Comprehensive Test Suite", async (t) => {
  const testSchool = "TEST-CAMPUS-01";
  const otherSchool = "OTHER-CAMPUS-99";

  const teacherA = {
    id: "tch_101",
    name: "Dr. A. Verma",
    role: "TCH",
    assigned_classes: ["Class 10-A", "Class 9-A"],
    subject: "Mathematics",
  };

  const teacherB = {
    id: "tch_102",
    name: "Mrs. S. Rao",
    role: "TCH",
    assigned_classes: ["Class 10-B"],
    subject: "Physics",
  };

  const student1 = {
    id: "stu_01",
    name: "Aarav Sharma",
    roll_number: "ROLL-01",
    class_id: "Class 10-A",
  };

  const student2 = {
    id: "stu_02",
    name: "Diya Patel",
    roll_number: "ROLL-02",
    class_id: "Class 10-A",
  };

  const student3 = {
    id: "stu_03",
    name: "Rohan Deshmukh",
    roll_number: "ROLL-03",
    class_id: "Class 10-A",
  };

  let createdTestId = null;

  // --------------------------------------------------------------------------
  // Requirement 1: Teacher can create a test for an assigned class and subject
  // --------------------------------------------------------------------------
  await t.test("1. Teacher can create a test for an assigned class and subject", async () => {
    const newTest = await createClassTest({
      schoolId: testSchool,
      classId: "Class 10-A",
      section: "A",
      subject: "Mathematics",
      title: "Mathematics Unit Test 1",
      testDate: "2026-11-04",
      maxScore: 20,
      passingScore: 8,
      actor: teacherA,
    });

    assert.ok(newTest.id, "Test must be assigned an ID");
    assert.strictEqual(newTest.status, "draft", "Initial test status must be draft");
    assert.strictEqual(newTest.class_id, "Class 10-A");
    assert.strictEqual(newTest.max_score, 20);
    assert.strictEqual(newTest.created_by, "Dr. A. Verma");

    createdTestId = newTest.id;
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Teacher can enter and save valid marks
  // --------------------------------------------------------------------------
  await t.test("2. Teacher can enter and save valid marks", async () => {
    const scores = [
      {
        student_id: student1.id,
        student_name: student1.name,
        roll_number: student1.roll_number,
        marks_obtained: 17,
        is_absent: false,
      },
      {
        student_id: student2.id,
        student_name: student2.name,
        roll_number: student2.roll_number,
        marks_obtained: 19,
        is_absent: false,
      },
      {
        student_id: student3.id,
        student_name: student3.name,
        roll_number: student3.roll_number,
        marks_obtained: 0,
        is_absent: true,
      },
    ];

    const result = await saveClassTestScores({
      schoolId: testSchool,
      testId: createdTestId,
      scoresList: scores,
      actor: teacherA,
      publish: false, // Save as Draft
    });

    assert.strictEqual(result.scoresCount, 3);
    assert.strictEqual(result.highestScore, 19, "Class highest among present students must be 19");
    assert.strictEqual(result.status, "draft", "Status should remain draft when publish=false");
  });

  // --------------------------------------------------------------------------
  // Requirement 3: Marks above maximum are rejected
  // --------------------------------------------------------------------------
  await t.test("3. Marks above maximum are rejected", () => {
    assert.throws(
      () => validateMarksInput(25, 20),
      /exceed maximum allowable score/,
      "Must throw error when marks exceed maximum"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 4: Negative marks are rejected
  // --------------------------------------------------------------------------
  await t.test("4. Negative marks are rejected", () => {
    assert.throws(
      () => validateMarksInput(-5, 20),
      /cannot be negative/,
      "Must throw error when marks are negative"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 5: Duplicate mark entries are prevented
  // --------------------------------------------------------------------------
  await t.test("5. Duplicate mark entries for same student are prevented", async () => {
    const duplicateScores = [
      {
        student_id: student1.id,
        student_name: student1.name,
        roll_number: student1.roll_number,
        marks_obtained: 15,
        is_absent: false,
      },
      {
        student_id: student1.id, // Duplicate student ID
        student_name: student1.name,
        roll_number: student1.roll_number,
        marks_obtained: 18,
        is_absent: false,
      },
    ];

    await assert.rejects(
      async () => {
        await saveClassTestScores({
          schoolId: testSchool,
          testId: createdTestId,
          scoresList: duplicateScores,
          actor: teacherA,
        });
      },
      /Duplicate entry detected for student ID/,
      "Must reject duplicate score submissions for the same student"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Unauthorized teachers cannot edit another teacher's class marks
  // --------------------------------------------------------------------------
  await t.test("6. Unauthorized teachers cannot edit another teacher's class marks", async () => {
    // Teacher B is assigned to 'Class 10-B', not 'Class 10-A'
    assert.strictEqual(
      isTeacherAuthorizedForClass(teacherB, "Class 10-A"),
      false,
      "Teacher B should not be authorized for Class 10-A"
    );

    await assert.rejects(
      async () => {
        await saveClassTestScores({
          schoolId: testSchool,
          testId: createdTestId,
          scoresList: [
            {
              student_id: student1.id,
              student_name: student1.name,
              roll_number: student1.roll_number,
              marks_obtained: 12,
              is_absent: false,
            },
          ],
          actor: teacherB,
        });
      },
      /Unauthorized: You do not have permission/,
      "Unauthorized teacher must be blocked from modifying marks"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 7: Students can see their own published marks
  // --------------------------------------------------------------------------
  await t.test("7. Students can see their own published marks after publication", async () => {
    // First publish the test
    await publishClassTest({
      schoolId: testSchool,
      testId: createdTestId,
      actor: teacherA,
    });

    const student1Marks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    assert.strictEqual(student1Marks.length, 1);
    assert.strictEqual(student1Marks[0].marks_obtained, 17);
    assert.strictEqual(student1Marks[0].max_score, 20);
    assert.strictEqual(student1Marks[0].title, "Mathematics Unit Test 1");
    assert.strictEqual(student1Marks[0].status, "published");
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Students cannot see another student's marks
  // --------------------------------------------------------------------------
  await t.test("8. Students cannot see another student's marks or identity", async () => {
    const student1Marks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    // Verify student 1 response contains ZERO information about Student 2 or 3
    const jsonStr = JSON.stringify(student1Marks);
    assert.strictEqual(jsonStr.includes("Diya Patel"), false, "Must not leak Student 2's name");
    assert.strictEqual(jsonStr.includes("stu_02"), false, "Must not leak Student 2's ID");
    assert.strictEqual(jsonStr.includes("ROLL-02"), false, "Must not leak Student 2's roll number");
    assert.strictEqual(jsonStr.includes("Rohan Deshmukh"), false, "Must not leak Student 3's name");
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Students cannot see unpublished results
  // --------------------------------------------------------------------------
  await t.test("9. Students cannot see unpublished results (Draft status)", async () => {
    // Create a new draft test that is NOT published
    const draftTest = await createClassTest({
      schoolId: testSchool,
      classId: "Class 10-A",
      section: "A",
      subject: "Science",
      title: "Science Pop Quiz (Unpublished)",
      testDate: "2026-11-04",
      maxScore: 10,
      actor: teacherA,
    });

    await saveClassTestScores({
      schoolId: testSchool,
      testId: draftTest.id,
      scoresList: [
        {
          student_id: student1.id,
          student_name: student1.name,
          roll_number: student1.roll_number,
          marks_obtained: 9,
          is_absent: false,
        },
      ],
      actor: teacherA,
      publish: false, // Kept in draft
    });

    const studentMarks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    // Student should only see the 1 published Mathematics test, NOT the Science draft
    const scienceFound = studentMarks.find((m) => m.title.includes("Science Pop Quiz"));
    assert.strictEqual(scienceFound, undefined, "Unpublished draft test must not be returned to students");
  });

  // --------------------------------------------------------------------------
  // Requirement 10: Students cannot modify marks
  // --------------------------------------------------------------------------
  await t.test("10. Students cannot modify marks", async () => {
    const studentActor = {
      id: "stu_01",
      name: "Aarav Sharma",
      role: "STU",
    };

    assert.strictEqual(
      isTeacherAuthorizedForClass(studentActor, "Class 10-A"),
      false,
      "Student role must not have grading authorization"
    );

    await assert.rejects(
      async () => {
        await saveClassTestScores({
          schoolId: testSchool,
          testId: createdTestId,
          scoresList: [
            {
              student_id: student1.id,
              student_name: student1.name,
              roll_number: student1.roll_number,
              marks_obtained: 20, // Tampering to 20/20
              is_absent: false,
            },
          ],
          actor: studentActor,
        });
      },
      /Unauthorized/,
      "Student attempt to save marks must be rejected"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 11: Class highest is calculated correctly from published records only
  // --------------------------------------------------------------------------
  await t.test("11. Class highest is calculated correctly from published records only", async () => {
    const student1Marks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    assert.strictEqual(student1Marks.length, 1);
    // Student 1 scored 17, but class highest was 19 (scored by Student 2)
    assert.strictEqual(student1Marks[0].marks_obtained, 17, "Student 1's own mark is 17");
    assert.strictEqual(student1Marks[0].class_highest, 19, "Class highest benchmark must be 19");
  });

  // --------------------------------------------------------------------------
  // Requirement 12: Different schools cannot access each other's tests or marks
  // --------------------------------------------------------------------------
  await t.test("12. Different schools cannot access each other's tests or marks", async () => {
    const otherSchoolMarks = await getStudentPublishedMarks({
      schoolId: otherSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    assert.strictEqual(
      otherSchoolMarks.length,
      0,
      "Query for a different school tenant must return 0 records"
    );

    const otherSchoolTests = await getClassTestsForTeacher({
      schoolId: otherSchool,
      actor: teacherA,
    });

    assert.strictEqual(
      otherSchoolTests.length,
      0,
      "Teacher querying a foreign school must see 0 tests"
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 13: Editing marks updates the result correctly
  // --------------------------------------------------------------------------
  await t.test("13. Editing marks updates the result correctly", async () => {
    // Teacher reviews re-evaluation and updates Student 1 from 17 to 18
    const updatedScores = [
      {
        student_id: student1.id,
        student_name: student1.name,
        roll_number: student1.roll_number,
        marks_obtained: 18,
        is_absent: false,
      },
      {
        student_id: student2.id,
        student_name: student2.name,
        roll_number: student2.roll_number,
        marks_obtained: 19,
        is_absent: false,
      },
      {
        student_id: student3.id,
        student_name: student3.name,
        roll_number: student3.roll_number,
        marks_obtained: 0,
        is_absent: true,
      },
    ];

    await saveClassTestScores({
      schoolId: testSchool,
      testId: createdTestId,
      scoresList: updatedScores,
      actor: teacherA,
      publish: true,
    });

    const refreshedMarks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student1.id,
      studentRoll: student1.roll_number,
    });

    assert.strictEqual(refreshedMarks[0].marks_obtained, 18, "Updated marks must reflect as 18");
    assert.strictEqual(refreshedMarks[0].class_highest, 19, "Class highest remains 19");
  });

  // --------------------------------------------------------------------------
  // Requirement 14: Absent status is handled correctly
  // --------------------------------------------------------------------------
  await t.test("14. Absent status is handled correctly", async () => {
    const student3Marks = await getStudentPublishedMarks({
      schoolId: testSchool,
      studentId: student3.id,
      studentRoll: student3.roll_number,
    });

    assert.strictEqual(student3Marks.length, 1);
    assert.strictEqual(student3Marks[0].is_absent, true, "Student 3 must have is_absent=true");
    assert.strictEqual(student3Marks[0].marks_obtained, 0, "Absent student score must be 0");
    assert.strictEqual(student3Marks[0].class_highest, 19, "Absent student still sees class benchmark");
    assert.strictEqual(student3Marks[0].remarks, "Absent", "Remarks indicates Absent");
  });
});

