import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import whatsappService from '../services/whatsapp.service';

/**
 * Contact form submission schema
 */
const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().regex(/^[+]?[\d\s()-]{10,20}$/, 'Invalid phone number').optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export class ContactController {
  /**
   * Submit contact form
   */
  async submitContactForm(req: Request, res: Response) {
    try {
      // Validate input
      const validatedData = contactFormSchema.parse(req.body);

      // Store in database (optional - for tracking)
      const contact = await prisma.contactSubmission.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          subject: validatedData.subject,
          message: validatedData.message,
        },
      });

      // Send WhatsApp notification (non-blocking)
      whatsappService.sendContactFormNotification({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        subject: validatedData.subject,
        message: validatedData.message,
        timestamp: contact.createdAt,
      }).catch(error => {
        console.error('⚠️  WhatsApp notification failed (non-critical):', error.message);
      });

      res.status(200).json({
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
      });
    } catch (error: any) {
      console.error('Contact form error:', error);

      // Return validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to submit contact form. Please try again later.',
      });
    }
  }

  /**
   * Get all contact submissions (admin only)
   */
  async getContactSubmissions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.contactSubmission.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contactSubmission.count(),
      ]);

      res.json({
        success: true,
        data: submissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Failed to fetch contact submissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact submissions',
      });
    }
  }
}

export default new ContactController();
