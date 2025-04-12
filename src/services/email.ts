import { supabase } from '../lib/supabase';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  async sendEmail(data: EmailData) {
    const { error } = await supabase.functions.invoke('send-email', {
      body: data
    });

    if (error) throw error;
    return true;
  },

  async sendWelcomeEmail(email: string, tempPassword: string) {
    const html = `
      <h2>Welcome to AttendQR!</h2>
      <p>Your account has been created. Here are your login credentials:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please login and change your password as soon as possible.</p>
      <p>Best regards,<br>The AttendQR Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to AttendQR - Your Account Details',
      html
    });
  },

  async sendClassEnrollmentEmail(email: string, className: string) {
    const html = `
      <h2>Class Enrollment Notification</h2>
      <p>You have been enrolled in the class: ${className}</p>
      <p>You can now access this class through your dashboard.</p>
      <p>Best regards,<br>The AttendQR Team</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Enrolled in ${className}`,
      html
    });
  }
};
