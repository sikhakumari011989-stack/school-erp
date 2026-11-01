import { supabase } from "../supabaseClient";

/**
 * TRANSPORT INTELLIGENCE SERVICE
 * Fleet Registry, Route Manifests, Document Expiry Tracking,
 * and GPS Device Connectivity State.
 */

export const DEFAULT_VEHICLES = [
  {
    id: "veh_1",
    vehicle_number: "MH-04-AZ-8812",
    capacity: 40,
    vehicle_model: "Tata Starbus Ultra 40-Seater",
    driver_name: "Santosh M. Jadhav",
    driver_phone: "+91 98201 55420",
    driver_license_no: "MH0420110029381",
    fitness_expiry: "2027-04-15",
    insurance_expiry: "2027-06-30",
    pollution_expiry: "2026-12-10",
    status: "active",
    gps_device_serial: null,
  },
  {
    id: "veh_2",
    vehicle_number: "MH-04-AZ-8815",
    capacity: 35,
    vehicle_model: "Force Traveller 35-Seater",
    driver_name: "Ramdas K. Patil",
    driver_phone: "+91 98202 77190",
    driver_license_no: "MH0420130088192",
    fitness_expiry: "2026-11-20", // Expiring soon warning!
    insurance_expiry: "2027-02-28",
    pollution_expiry: "2027-01-15",
    status: "active",
    gps_device_serial: null,
  },
];

export const DEFAULT_ROUTES = [
  {
    id: "route_1",
    route_code: "ROUTE-01-PALGHAR",
    route_name: "Palghar Station to Campus Main Gate",
    assigned_vehicle_number: "MH-04-AZ-8812",
    morning_departure_time: "07:15 AM",
    afternoon_departure_time: "02:30 PM",
    monthly_transport_fee: 2200,
    stops: [
      { stop_name: "Palghar Railway Station (East)", pickup_time: "07:15 AM", drop_time: "03:15 PM" },
      { stop_name: "Mahim Road Naka", pickup_time: "07:28 AM", drop_time: "03:00 PM" },
      { stop_name: "Shirgaon Beach Junction", pickup_time: "07:40 AM", drop_time: "02:45 PM" },
      { stop_name: "Campus Gate 1", pickup_time: "07:55 AM", drop_time: "02:30 PM" },
    ],
  },
  {
    id: "route_2",
    route_code: "ROUTE-02-BOISAR",
    route_name: "Boisar MIDC to Campus",
    assigned_vehicle_number: "MH-04-AZ-8815",
    morning_departure_time: "07:00 AM",
    afternoon_departure_time: "02:30 PM",
    monthly_transport_fee: 2600,
    stops: [
      { stop_name: "Boisar Station Circle", pickup_time: "07:00 AM", drop_time: "03:30 PM" },
      { stop_name: "Tarapur MIDC Gate 2", pickup_time: "07:20 AM", drop_time: "03:10 PM" },
      { stop_name: "Kamblale Phata", pickup_time: "07:35 AM", drop_time: "02:50 PM" },
      { stop_name: "Campus Gate 1", pickup_time: "07:55 AM", drop_time: "02:30 PM" },
    ],
  },
];

export const DEFAULT_ALLOCATIONS = [
  {
    id: "alloc_1",
    student_id: "STU-101",
    student_name: "Aarav Mehta",
    class_name: "Class 10-ICSE",
    route_code: "ROUTE-01-PALGHAR",
    stop_name: "Palghar Railway Station (East)",
    pickup_time: "07:15 AM",
    drop_time: "03:15 PM",
    emergency_parent_phone: "+91 98201 12233",
    status: "active",
  },
  {
    id: "alloc_2",
    student_id: "STU-108",
    student_name: "Aman Verma",
    class_name: "Class 10-A",
    route_code: "ROUTE-01-PALGHAR",
    stop_name: "Mahim Road Naka",
    pickup_time: "07:28 AM",
    drop_time: "03:00 PM",
    emergency_parent_phone: "+91 98201 44820",
    status: "active",
  },
  {
    id: "alloc_3",
    student_id: "STU-114",
    student_name: "Riya Sen",
    class_name: "Class 9-B",
    route_code: "ROUTE-02-BOISAR",
    stop_name: "Boisar Station Circle",
    pickup_time: "07:00 AM",
    drop_time: "03:30 PM",
    emergency_parent_phone: "+91 98202 88412",
    status: "active",
  },
];

/**
 * Returns real GPS status (never synthetic or fabricated)
 */
export function getGpsTrackingStatus() {
  const isGpsConnected = Boolean(import.meta.env.VITE_GPS_TRACKER_ENDPOINT);
  return {
    isLive: isGpsConnected,
    statusText: isGpsConnected ? "Live Telemetry Connected" : "GPS Tracker Disconnected (Awaiting IoT OBD Device Pairing)",
    providerName: isGpsConnected ? "AIS-140 Certified GPS Feed" : "Hardware Device Not Linked",
  };
}

/**
 * Computes fleet metrics and document expiry warnings
 */
export function calculateFleetMetrics(vehicles = [], routes = [], allocations = []) {
  const totalVehicles = vehicles.length;
  const totalSeats = vehicles.reduce((sum, v) => sum + Number(v.capacity || 0), 0);
  const totalStudentsTransported = allocations.length;
  const capacityUtilization = totalSeats > 0 ? Math.round((totalStudentsTransported / totalSeats) * 100) : 0;

  // Scan expiring documents within 30 days
  const now = new Date();
  const expiringVehicles = [];

  vehicles.forEach((v) => {
    const checks = [
      { doc: "Fitness Certificate", dateStr: v.fitness_expiry },
      { doc: "Insurance Policy", dateStr: v.insurance_expiry },
      { doc: "PUC Pollution Check", dateStr: v.pollution_expiry },
    ];

    checks.forEach((c) => {
      if (c.dateStr) {
        const d = new Date(c.dateStr);
        const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          expiringVehicles.push({
            vehicleNumber: v.vehicle_number,
            driverName: v.driver_name,
            document: c.doc,
            expiryDate: c.dateStr,
            daysRemaining: diffDays,
          });
        }
      }
    });
  });

  return {
    totalVehicles,
    totalRoutes: routes.length,
    totalSeats,
    totalStudentsTransported,
    capacityUtilization,
    expiringVehicles,
  };
}

