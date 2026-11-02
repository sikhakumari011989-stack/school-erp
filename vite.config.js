import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function biometricDevPlugin() {
  return {
    name: 'biometric-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/v2/attendance/sync')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 'private, no-store, max-age=0')
          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            return res.end()
          }
          if (req.method === 'GET') {
            res.statusCode = 200
            return res.end(
              JSON.stringify({
                status: 'active',
                service: 'Biometric Hardware Adapter Dev Gateway',
                supported_hardware: ['eSSL', 'Matrix COSEC', 'ZKTeco', 'Hikvision'],
                endpoint: '/api/v2/attendance/sync',
              })
            )
          }
          if (req.method === 'POST') {
            const rawTs = req.headers['x-device-timestamp']
            if (rawTs) {
              const reqEpoch = new Date(rawTs).getTime()
              if (!isNaN(reqEpoch) && Math.abs(Date.now() - reqEpoch) > 5 * 60 * 1000) {
                res.statusCode = 401
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Replay protection triggered: Device timestamp is skewed by more than 5 minutes.',
                  })
                )
              }
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const count = Array.isArray(parsed.punches) ? parsed.punches.length : 1
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    success: true,
                    status: 'synchronized',
                    device_id: parsed.deviceId || parsed.device_id || 'ESSL-BIO-01',
                    device_serial: parsed.device_serial || parsed.deviceSerial || req.headers['x-device-serial'] || 'ESSL-SN-99824',
                    school_id: parsed.schoolId || parsed.school_id || 'CAMPUS-01',
                    processed_count: count,
                    deduplicated_count: 0,
                    timestamp: new Date().toISOString(),
                    hardware_adapter: 'eSSL / Matrix / ZKTeco Ingestion Engine',
                    message: `Successfully synchronized ${count} biometric punch event(s).`,
                  })
                )
              } catch {
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    success: true,
                    status: 'synchronized',
                    processed_count: 1,
                  })
                )
              }
            })
            return
          }
        }
        next()
      })
    },
  }
}

function masterDevPlugin() {
  return {
    name: 'master-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/master/')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 'private, no-store, max-age=0')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            return res.end()
          }

          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {}
            } catch {
              req.body = {}
            }

            // Create Express-like res helper methods for Vercel handler compatibility
            res.status = function (code) {
              res.statusCode = code
              return res
            }
            res.json = function (obj) {
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify(obj))
            }

            try {
              if (req.url.startsWith('/api/master/auth')) {
                const { default: authHandler } = await import('./api/master/auth.js')
                return authHandler(req, res)
              } else if (req.url.startsWith('/api/master/schools')) {
                const { default: schoolsHandler } = await import('./api/master/schools.js')
                return schoolsHandler(req, res)
              }
            } catch (err) {
              res.statusCode = 500
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
            next()
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), biometricDevPlugin(), masterDevPlugin()],
})
