import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        index:             resolve(__dirname, 'index.html'),
        register:          resolve(__dirname, 'register.html'),
        studentDashboard:  resolve(__dirname, 'student/dashboard.html'),
        studentSubmit:     resolve(__dirname, 'student/submit.html'),
        studentTicket:     resolve(__dirname, 'student/ticket.html'),
        staffDashboard:    resolve(__dirname, 'staff/dashboard.html'),
        staffTicket:       resolve(__dirname, 'staff/ticket.html'),
        adminDashboard:    resolve(__dirname, 'admin/dashboard.html'),
        adminUsers:        resolve(__dirname, 'admin/users.html'),
      },
    },
  },
});
