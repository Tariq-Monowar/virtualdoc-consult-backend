import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto, userId: string) {
    try {
      // Find the appointment to verify it exists and belongs to the user
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: createReviewDto.appointment_id },
        include: {
          service: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // Verify the appointment belongs to the user
      if (appointment.user_id !== userId) {
        throw new ForbiddenException(
          'You can only review your own appointments',
        );
      }

      // Verify the appointment is completed
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        throw new BadRequestException(
          'You can only review completed appointments',
        );
      }

      // Check if a review already exists for this appointment
      const existingReview = await this.prisma.review.findUnique({
        where: { appointment_id: createReviewDto.appointment_id },
      });

      if (existingReview) {
        throw new BadRequestException(
          'A review already exists for this appointment',
        );
      }

      // Create the review
      const review = await this.prisma.review.create({
        data: {
          rating: createReviewDto.rating,
          review: createReviewDto.review,
          tags: createReviewDto.tags || [],
          appointment_id: createReviewDto.appointment_id,
          reviewer_id: userId,
          service_id: appointment.service_id,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
        },
      });

      // Update service average rating (optional enhancement)
      await this.updateServiceAverageRating(appointment.service_id);

      return {
        success: true,
        data: review,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(query?: {
    service_id?: string;
    reviewer_id?: string;
    rating?: number;
    limit?: number;
    page?: number;
  }) {
    try {
      const limit = Number(query?.limit) || 10;
      const page = Number(query?.page) || 1;
      const skip = (page - 1) * limit;

      // Build where conditions based on query parameters
      const where: any = {};

      if (query?.service_id) {
        where.service_id = query.service_id;
      }

      if (query?.reviewer_id) {
        where.reviewer_id = query.reviewer_id;
      }

      if (query?.rating) {
        where.rating = Number(query.rating);
      }

      // Count total reviews matching the criteria
      const totalCount = await this.prisma.review.count({ where });

      // Get reviews with pagination
      const reviews = await this.prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      return {
        success: true,
        data: reviews,
        meta: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
          appointment: {
            select: {
              id: true,
              created_at: true,
              status: true,
            },
          },
        },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      return {
        success: true,
        data: review,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    try {
      // Find the review to verify it exists and belongs to the user
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Verify the review belongs to the user
      if (review.reviewer_id !== userId) {
        throw new ForbiddenException('You can only update your own reviews');
      }

      // Update the review
      const updatedReview = await this.prisma.review.update({
        where: { id },
        data: {
          rating: updateReviewDto.rating,
          review: updateReviewDto.review,
          tags: updateReviewDto.tags,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
        },
      });

      // Update service average rating
      await this.updateServiceAverageRating(review.service_id);

      return {
        success: true,
        data: updatedReview,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string, userId: string) {
    try {
      // Find the review to verify it exists and belongs to the user
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Verify the review belongs to the user
      if (review.reviewer_id !== userId) {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      // Delete the review
      await this.prisma.review.delete({
        where: { id },
      });

      // Update service average rating
      await this.updateServiceAverageRating(review.service_id);

      return {
        success: true,
        message: 'Review deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Helper methods
  async findByServiceId(
    serviceId: string,
    query?: { limit?: number; page?: number },
  ) {
    try {
      const limit = Number(query?.limit) || 10;
      const page = Number(query?.page) || 1;
      const skip = (page - 1) * limit;

      const totalCount = await this.prisma.review.count({
        where: { service_id: serviceId },
      });

      const reviews = await this.prisma.review.findMany({
        where: { service_id: serviceId },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      return {
        success: true,
        data: reviews,
        meta: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findByUserId(
    userId: string,
    query?: { limit?: number; page?: number },
  ) {
    try {
      const limit = Number(query?.limit) || 10;
      const page = Number(query?.page) || 1;
      const skip = (page - 1) * limit;

      const totalCount = await this.prisma.review.count({
        where: { reviewer_id: userId },
      });

      const reviews = await this.prisma.review.findMany({
        where: { reviewer_id: userId },
        include: {
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      });

      return {
        success: true,
        data: reviews,
        meta: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getServiceRatingSummary(serviceId: string) {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { service_id: serviceId },
        select: { rating: true },
      });

      if (reviews.length === 0) {
        return {
          success: true,
          data: {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: {
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0,
            },
          },
        };
      }

      // Calculate average rating
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0,
      );
      const averageRating = totalRating / reviews.length;

      // Calculate rating distribution
      const ratingDistribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });

      return {
        success: true,
        data: {
          averageRating,
          totalReviews: reviews.length,
          ratingDistribution,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private async updateServiceAverageRating(serviceId: string) {
    // This is a placeholder for future implementation
    // You might want to store the average rating in the Service model
    // or calculate it on-the-fly when needed
    const summary = await this.getServiceRatingSummary(serviceId);
    return summary;
  }

  // Add this method to your existing ReviewService class

  async getRandomPositiveReviews(options: {
    limit?: number;
    minRating?: number;
  }) {
    try {
      const limit = Number(options?.limit) || 3;
      const minRating = Number(options?.minRating);
  
      // Build the where clause based on options
      const whereClause: any = {
        // Only include reviews with text content
        AND: [
          {
            review: {
              not: null,
            },
          },
          {
            review: {
              not: '',
            },
          },
        ],
      };
  
      // Add rating filter only if minRating is provided
      if (minRating) {
        whereClause.rating = {
          gte: minRating,
        };
      }
  
      // Get reviews based on criteria
      const reviews = await this.prisma.review.findMany({
        where: whereClause,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              profession: true,
            },
          },
          service: {
            select: {
              id: true,
              service_provider_name: true,
              category: true,
            },
          },
        },
      });
  
      // Shuffle the reviews (Fisher-Yates algorithm)
      for (let i = reviews.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
      }
  
      // Return the requested number of reviews with simplified structure
      const selectedReviews = reviews.slice(0, limit).map((review) => ({
        id: review.id,
        testimonial: review.review,
        rating: review.rating,
        reviewer_name: review.reviewer.name,
        reviewer_profession: review.reviewer.profession || 'Patient', // Default to "Patient" if profession is null
        reviewer_avatar: review.reviewer.avatar
          ? SojebStorage.url(
              appConfig().storageUrl.avatar + review.reviewer.avatar,
            )
          : null,
        service_name: review.service.category, // Changed to category
        service_provider_name: review.service.service_provider_name, // Added service provider name
      }));
  
      return {
        success: true,
        data: selectedReviews,
        meta: {
          total: reviews.length,
          returned: selectedReviews.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
