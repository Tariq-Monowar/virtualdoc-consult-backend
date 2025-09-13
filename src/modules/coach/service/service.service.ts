import { Injectable } from '@nestjs/common';
import { CreateServiceDto, ScheduleDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { scheduled } from 'rxjs';
import { groupBy } from 'lodash';

@Injectable()
export class ServiceService {

  constructor(private readonly prisma: PrismaService) { }

  async create({
    createServiceDto,
    userId,
    thumbnail,
    certificates = [],
  }: {
    createServiceDto: CreateServiceDto;
    userId: string;
    thumbnail?: Express.Multer.File;
    certificates: Express.Multer.File[];
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          approved_at: true,
        },
      });

      // Check if approved
      if (user.approved_at !== 'approved') {
        return {
          success: false,
          message:
            'Your profile is pending approval from admin. Please wait for approval before creating services.',
        };
      }

      let parsedSchedules: ScheduleDto[] = [];

      if (typeof createServiceDto.schedules === 'string') {
        try {
          const parsed = JSON.parse(createServiceDto.schedules);
          if (!Array.isArray(parsed))
            throw new Error('Parsed schedules data is not an array');
          parsedSchedules = parsed;
        } catch (parseError) {
          throw new Error('Failed to parse schedules data');
        }
      } else if (Array.isArray(createServiceDto.schedules)) {
        parsedSchedules = createServiceDto.schedules;
      } else {
        throw new Error('Schedules data is not in a valid format');
      }

      const totalSlot: number = createServiceDto.total_slot;
      //console.log(parsedSchedules);


      let parsedQuestions: string[] = [];
      parsedQuestions = Array.isArray(createServiceDto.questions)
        ? createServiceDto.questions
        : JSON.parse(createServiceDto.questions);


      const endDate = new Date(parsedSchedules?.[0]?.date);
      endDate.setDate(endDate.getDate() + 30);


      const service = await this.prisma.service.create({
        data: {
          category: createServiceDto.category,
          service_provider_name: createServiceDto.service_provider_name,
          descriptions: createServiceDto.descriptions,
          certification: createServiceDto.certification,
          duration: createServiceDto.duration,
          price: createServiceDto.price,
          total_slot: createServiceDto.total_slot,
          questions: parsedQuestions,
          user_id: userId,
          endDate: endDate.toISOString(),

          schedules: {
            create: parsedSchedules.map((schedule) => ({
              date: new Date(schedule.date),
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              frequency: schedule.frequency,
              days_ofweek: schedule.days_ofweek ?? [],
            })),
          },
        },
        include: { schedules: true }

      });

      // Handle document upload
      const uploadedImages: {
        file_name: string;
        mime_type: string;
        file_path: string;
      }[] = [];

      // Handle Thumbnail upload
      const uploadedImagesThumbnail: {
        file_name: string;
        mime_type: string;
        file_path: string;
      }[] = [];

      for (const image of certificates) {
        try {
          const existingDocs = await this.prisma.serviceDocument.findMany({
            where: {
              user_id: userId,
              file_name: image.originalname,
              type: 'certificate',
            },
          });

          for (const doc of existingDocs) {
            try {
              if (doc.file_path) {
                await SojebStorage.delete(
                  appConfig().storageUrl.documents + doc.file_path,
                );
              }
              await this.prisma.serviceDocument.delete({
                where: { id: doc.id },
              });
            } catch (error) {
              console.error(`Error deleting document ${doc.id}`, error);
            }
          }

          const fileName = `${Date.now()}_${image.originalname}`;
          if (!appConfig().storageUrl?.documents) {
            throw new Error('Storage configuration is missing');
          }

          const filePath = appConfig().storageUrl.documents + fileName;
          console.log('Uploading file:', { fileName, filePath });

          await SojebStorage.put(filePath, image.buffer);

          uploadedImages.push({
            file_name: image.originalname,
            mime_type: image.mimetype,
            file_path: fileName,
          });
        } catch (error) {
          console.error(
            `Error uploading document: ${image.originalname}`,
            error,
          );
          throw new Error(`Failed to upload file: ${error.message}`);
        }
      }

      if (uploadedImages.length > 0) {
        await this.prisma.serviceDocument.createMany({
          data: uploadedImages.map((file) => ({
            user_id: userId,
            service_id: service.id,
            file_path: file.file_path,
            file_name: file.file_name,
            file_type: file.mime_type,
            type: 'certificate',
          })),
        });
      }

      // Then handle the single `thumbnail` file
      if (thumbnail) {
        try {
          const existingThumbs = await this.prisma.serviceDocument.findMany({
            where: {
              user_id: userId,
              file_name: thumbnail.originalname,
              type: 'thumbnail',
            },
          });

          for (const doc of existingThumbs) {
            try {
              if (doc.file_path) {
                await SojebStorage.delete(
                  appConfig().storageUrl.documents + doc.file_path,
                );
              }
              await this.prisma.serviceDocument.delete({
                where: { id: doc.id },
              });
            } catch (error) {
              console.error(
                `Error deleting thumbnail document ${doc.id}`,
                error,
              );
            }
          }

          const fileName = `${Date.now()}_${thumbnail.originalname}`;
          const filePath = appConfig().storageUrl.documents + fileName;
          console.log('Uploading thumbnail:', { fileName, filePath });

          await SojebStorage.put(filePath, thumbnail.buffer);

          uploadedImagesThumbnail.push({
            file_name: thumbnail.originalname,
            mime_type: thumbnail.mimetype,
            file_path: fileName,
          });
        } catch (error) {
          console.error(
            `Error uploading thumbnail: ${thumbnail.originalname}`,
            error,
          );
          throw new Error(`Failed to upload thumbnail: ${error.message}`);
        }

        if (uploadedImagesThumbnail.length > 0) {
          await this.prisma.serviceDocument.createMany({
            data: uploadedImagesThumbnail.map((file) => ({
              user_id: userId,
              service_id: service.id,
              file_path: file.file_path,
              file_name: file.file_name,
              file_type: file.mime_type,
              type: 'thumbnail',
            })),
          });
        }
      }

      // Auto-generate slots for each schedule
      //console.log(service.schedules.length, "line 123")

      //console.log("sdjfhewiufhwefwehfuiwehfiewhfjewfhewfhewifhewifuhewu", createServiceDto.schedules)

      for (const schedule of service.schedules) {
        const slotsToCreate = await generateSlotsFromScheduleBasedOnTotalSlots(
          normalizeSchedule(schedule),
          totalSlot,
        );

        const validSlots = slotsToCreate.filter(
          (slot) =>
            slot.date instanceof Date &&
            !isNaN(slot.date.getTime()) &&
            typeof slot.start_time === 'string' &&
            typeof slot.end_time === 'string',
        );

        if (validSlots.length > 0) {
          await this.prisma.slot.createMany({
            data: validSlots.map((slot) => ({
              date: slot.date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              schedule_id: schedule.id,
            })),
          });
        }
      }

      const allServices = await this.prisma.service.findMany({
        where: { user_id: userId },
        include: {
          schedules: true,
          service_document: true,
        },
        orderBy: { created_at: 'desc' },
      });

      if (allServices.length === 0) {
        throw new Error('No services found for this user.');
      }

      const prices = allServices
        .map((service) => service.price)
        .filter((price): price is number => price !== null);

      if (prices.length === 0) {
        throw new Error('No valid service prices found for this user.');
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const uniqueCategories = [...new Set(allServices.map((s) => s.category))];

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          min_price: minPrice,
          max_price: maxPrice,
          categories: uniqueCategories,
        },
      });

      return {
        success: true,
        message: 'Service created successfully',
      };
    } catch (error) {
      console.error('Error creating service:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async regenerateSchedulesAndSlotsManually(serviceId: string) {
  const today = new Date();

  console.log(serviceId)

  // Fetch the specific service by ID
  const service = await this.prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      schedules: true,
    },
  });

  if (!service) {
    return {
      success: false,
      message: 'Service not found.',
    };
  }

  for (const schedule of service.schedules) {
    const originalDate = new Date(schedule.date);

    // Skip future schedules
    if (originalDate >= today) continue;

    const newDate = new Date(originalDate);
    newDate.setDate(newDate.getDate() + 30);

    // Duplicate schedule
    const newSchedule = await this.prisma.schedule.create({
      data: {
        date: newDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        frequency: schedule.frequency,
        days_ofweek: schedule.days_ofweek,
        service_id: service.id,
      },
    });

    // Regenerate slots for new schedule
    const slotsToCreate = await generateSlotsFromScheduleBasedOnTotalSlots(
      normalizeSchedule(newSchedule),
      service.total_slot
    );

    const validSlots = slotsToCreate.filter(
      (slot) =>
        slot.date instanceof Date &&
        !isNaN(slot.date.getTime()) &&
        typeof slot.start_time === 'string' &&
        typeof slot.end_time === 'string'
    );

    if (validSlots.length > 0) {
      await this.prisma.slot.createMany({
        data: validSlots.map((slot) => ({
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          schedule_id: newSchedule.id,
        })),
      });
    }
  }

  return {
    success: true,
    message: 'Schedules and slots for service successfully updated.',
  };
}



  async findAllWithPagination(limit: number, page: number) {
    const [Service, totalService] = await Promise.all([
      this.prisma.service.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          schedules: true,
          service_document: true,

        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.service.count(),
    ]);

    return {
      data: Service,
      meta: {
        total: totalService,
        page,
        limit,
        totalPages: Math.ceil(totalService / limit),
      },
    };
  }


  async findAllByUserId(user_id: string,) {


    const [data, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where: { user_id },
        include: {
          schedules: true,
          service_document: true,

        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.service.count({
        where: { user_id },
      }),
    ]);

    return {
      data,
      total,

    };
  }


  findAll() {
    return `This action returns all service`;
  }


  async findOne(id: string) {
    try {
      // First, fetch the service with slots
      const serviceWithSlots = await this.prisma.service.findUnique({
        where: { id },
        include: {
          schedules: {
            include: {
              slots: true,
            },
          },
          service_document: true,
        },
      });

      if (!serviceWithSlots) {
        return {
          success: false,
          message: 'Service not found',
        };
      }

      // Flatten all slots across schedules
      const allSlots = serviceWithSlots.schedules.flatMap(schedule => schedule.slots);

      // Group slots by date
      const groupedSlots = groupBy(allSlots, slot =>
        new Date(slot.date).toISOString().split('T')[0]
      );

      // Remove slots from each schedule
      const schedulesWithoutSlots = serviceWithSlots.schedules.map(schedule => {
        const { slots, ...rest } = schedule;
        return rest;
      });

      // Construct the new service object without slots in schedules
      const serviceWithoutSlots = {
        ...serviceWithSlots,
        schedules: schedulesWithoutSlots,
      };

      // Return the cleaned-up service and grouped slots
      return {
        success: true,
        data: {
          ...serviceWithoutSlots,
          groupedSlots,
        },
      };
    } catch (error) {
      console.error('Error fetching service:', error);

      return {
        success: false,
        message: 'An error occurred while fetching the service',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  update(id: number, updateServiceDto: UpdateServiceDto) {
    return `This action updates a #${id} service`;
  }

  remove(id: number) {
    return `This action removes a #${id} service`;
  }
}






async function generateSlotsFromScheduleBasedOnTotalSlots(
  schedule: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    frequency: 'DAILY' | 'MONTHLY';
    days_ofweek: string[];
  },
  totalSlot: number
): Promise<{ date: Date; start_time: string; end_time: string }[]> {
  const slots = [];
  const baseDate = new Date(schedule.date);
  const daysToGenerate = 30;

  //console.log(schedule, "line 360");

  for (let i = 0; i < daysToGenerate; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);

    const dayName = currentDate
      .toLocaleString('en-US', { weekday: 'long' })
      .toUpperCase();

    if (
      schedule.frequency === 'DAILY' ||
      (schedule.frequency === 'MONTHLY' && schedule.days_ofweek.includes(dayName))
    ) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);

      const start = new Date(currentDate);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(currentDate);
      end.setHours(endHour, endMin, 0, 0);

      const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      if (totalSlot <= 0 || totalMinutes <= 0) continue;

      const slotDuration = totalMinutes / totalSlot;

      let current = new Date(start);

      for (let j = 0; j < totalSlot; j++) {
        const next = new Date(current);
        next.setMinutes(current.getMinutes() + slotDuration);

        // Simulate async work (optional)
        // await someAsyncFunction(current, next);

        slots.push({
          date: new Date(current),
          start_time: formatTime(current),
          end_time: formatTime(next),
        });

        current = next;
      }
    }
  }


  return slots;
}


function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}





function normalizeSchedule(schedule: any) {
  return {
    ...schedule,
    date: new Date(schedule.date), // Ensure it's a valid Date object
    startTime: convertTo24HourFormat(schedule.startTime),
    endTime: convertTo24HourFormat(schedule.endTime),
  };
}



function convertTo24HourFormat(timeStr: string): string {
  if (!timeStr) return '';

  // Check if the time already looks like 24-hour format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return timeStr; // Already good
  }

  const [time, modifier] = timeStr.split(' ');

  if (!time || !modifier) {
    console.warn("Invalid time format:", timeStr);
    return ''; // Early exit
  }

  let [hours, minutes] = time.split(':').map(Number);

  if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
  if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}



