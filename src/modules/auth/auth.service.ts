// external imports
import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
//internal imports
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { MailService } from '../../mail/mail.service';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import appConfig from '../../config/app.config';
import { SojebStorage } from '../../common/lib/Disk/SojebStorage';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { on } from 'events';
import { GoogleLoginDto } from './dto/create-user.dto';
import { FirebaseService } from './firebase.service';

@Injectable()
export class AuthService extends PrismaClient {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
   
    private readonly firebase: FirebaseService
  ) {
    super();
  }

  async me(userId: string) {
    try {

      if (!userId) {  
        return {
          success: false,
          message: 'User ID is required',
        };
      }


      const result = await this.prisma.wallet.aggregate({
        where: {
          userId: userId,
        },
        _sum: {
          balance: true,
        },
      });

      const totalbalance = result._sum.balance || 0;

      const oneuser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          totalbalance: totalbalance,
        },
      });
      if (!oneuser) {
        return {
          success: false,
          message: 'User not found',
        };
      }



      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          banner: true,
          address: true,
          phone_number: true,
          type: true,
          gender: true,
          date_of_birth: true,
          country: true,
          age: true,
          city: true,
          language: true,
          education: true,
          experience: true,
          created_at: true,
          profession: true,
          bio: true,
          skills: true,
          banking_id: true,
          billing_id: true,
          totalbalance: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + user.avatar,
        );
      }

      if (user.banner) {
        user['banner_url'] = SojebStorage.url(
          appConfig().storageUrl.banner + user.banner,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async convertToVendor(user_id: string) {
    try {
      const response = await UserRepository.convertTo(user_id, 'vendor');

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // async updateUser(
  //   userId: string,
  //   updateUserDto: UpdateUserDto,
  //   image?: Express.Multer.File,
  // ) {
  //   try {
  //     const data: any = {};
  //     if (updateUserDto.name) {
  //       data.name = updateUserDto.name;
  //     }
  //     if (updateUserDto.first_name) {
  //       data.first_name = updateUserDto.first_name;
  //     }
  //     if (updateUserDto.last_name) {
  //       data.last_name = updateUserDto.last_name;
  //     }

  //     if (updateUserDto.age) {
  //       data.age = updateUserDto.age;
  //     }
  //     if (updateUserDto.language) {
  //       data.language = updateUserDto.language;
  //     }
  //     if (updateUserDto.education) {
  //       data.education = updateUserDto.education;
  //     }
  //     if (updateUserDto.location) {
  //       data.location = updateUserDto.location;
  //     }
  //     if (updateUserDto.experience) {
  //       data.experience = updateUserDto.experience;
  //     }

  //     if (updateUserDto.phone_number) {
  //       data.phone_number = updateUserDto.phone_number;
  //     }

  //     if (updateUserDto.gender) {
  //       data.gender = updateUserDto.gender;
  //     }
  //     if (updateUserDto.date_of_birth) {
  //       data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
  //     }
  //     if (image) {
  //       // delete old image from storage
  //       const oldImage = await this.prisma.user.findFirst({
  //         where: { id: userId },
  //         select: { avatar: true },
  //       });
  //       if (oldImage.avatar) {
  //         await SojebStorage.delete(
  //           appConfig().storageUrl.avatar + oldImage.avatar,
  //         );
  //       }
  //       // upload image
  //       const randomName = Array(32)
  //         .fill(null)
  //         .map(() => Math.round(Math.random() * 16).toString(16))
  //         .join('');
  //       const fileName = `${randomName}${image.originalname}`;
  //       await SojebStorage.put(appConfig().storageUrl.avatar + fileName, image.buffer)
  //       await SojebStorage.delete(appConfig().storageUrl.avatar + fileName,)
  //       data.avatar = fileName;
  //     }
  //     const user = await UserRepository.getUserDetails(userId);
  //     if (user) {
  //       await this.prisma.user.update({
  //         where: { id: userId },
  //         data: {
  //           ...data,
  //         },
  //       });

  //       return {
  //         success: true,
  //         message: 'User updated successfully',
  //       };
  //     } else {
  //       return {
  //         success: false,
  //         message: 'User not found',
  //       };
  //     }
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }

  async updateUser({
    userId,
    updateUserDto,
    avatar,
    documents,
    banner,
  }: {
    userId: string;
    updateUserDto: UpdateUserDto;
    avatar?: Express.Multer.File; // All images
    documents?: Express.Multer.File[]; // All documents
    banner?: Express.Multer.File; // Banner image
  }) {
    try {
      const data: any = {};

      // Update user profile fields (except images)
      if (updateUserDto.name) data.name = updateUserDto.name;
      if (updateUserDto.first_name) data.first_name = updateUserDto.first_name;
      if (updateUserDto.last_name) data.last_name = updateUserDto.last_name;
      if (updateUserDto.age) data.age = Number(updateUserDto.age);
      if (updateUserDto.gender) data.gender = updateUserDto.gender;
      if (updateUserDto.country) data.country = updateUserDto.country;
      if (updateUserDto.city) data.city = updateUserDto.city;
      if (updateUserDto.address) data.address = updateUserDto.address;
      if (updateUserDto.language) data.language = updateUserDto.language;
      if (updateUserDto.education) data.education = updateUserDto.education;
      if (updateUserDto.experience) data.experience = updateUserDto.experience;
      if (updateUserDto.phone_number)
        data.phone_number = updateUserDto.phone_number;
      if (updateUserDto.profession) data.profession = updateUserDto.profession;
      if (updateUserDto.bio) data.bio = updateUserDto.bio;
      if (updateUserDto.skills) data.skills = updateUserDto.skills;

      // Check if user exists
      const user = await UserRepository.getUserDetails(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      // set profile picture
      if (avatar) {
        // Delete old avatar if exists
        const oldAvatar = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });

        if (oldAvatar?.avatar) {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldAvatar.avatar,
          );
        }

        // Upload new avatar
        const fileName = `${Date.now()}_${avatar.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.avatar + fileName,
          avatar.buffer,
        );

        // Update avatar field in users table
        data.avatar = fileName;
      }

      // set banner image
      if (banner) {
        // Delete old banner if exists
        const oldBanner = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { banner: true },
        });

        if (oldBanner?.banner) {
          await SojebStorage.delete(
            appConfig().storageUrl.banner + oldBanner.banner,
          );
        }

        // Upload new banner
        const fileName = `${Date.now()}_${banner.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.banner + fileName,
          banner.buffer,
        );

        // Update banner field in users table
        data.banner = fileName;
      }

      // upload documents like certificate, passport, id card, etc.
      if (documents && documents.length > 0) {
        const uploadedImages: {
          file_name: string;
          mime_type: string;
          file_path: string;
        }[] = [];

        for (const image of documents) {
          try {
            // Check for existing document with same original name
            const existingDocs = await this.prisma.userDocument.findMany({
              where: {
                user_id: userId,
                file_name: image.originalname,
              },
            });

            // Delete all existing documents with same name
            for (const doc of existingDocs) {
              await SojebStorage.delete(
                appConfig().storageUrl.documents + doc.file_path,
              );
              await this.prisma.userDocument.delete({
                where: { id: doc.id },
              });
            }

            // Generate unique filename with timestamp (same as avatar)
            const fileName = `${Date.now()}_${image.originalname}`;

            await SojebStorage.put(
              appConfig().storageUrl.documents + fileName,
              image.buffer,
            );

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
          }
        }

        // Save all images in the `documents` table
        if (uploadedImages.length > 0) {
          await this.prisma.userDocument.createMany({
            data: uploadedImages.map((file) => ({
              user_id: userId,
              file_path: file.file_path,
              file_name: file.file_name,
              file_type: file.mime_type,
            })),
          });
        }
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { ...data },
      });

      return {
        success: true,
        message: 'User updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        if (user.is_two_factor_enabled) {
          if (token) {
            const isValid = await UserRepository.verify2FA(user.id, token);
            if (!isValid) {
              throw new UnauthorizedException('Invalid token');
              // return {
              //   success: false,
              //   message: 'Invalid token',
              // };
            }
          } else {
            throw new UnauthorizedException('Token is required');
            // return {
            //   success: false,
            //   message: 'Token is required',
            // };
          }
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  async login({ email, userId }) {
    try {
      const payload = { email: email, sub: userId };
      const token = this.jwtService.sign(payload);
      const user = await UserRepository.getUserDetails(userId);

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          token: token,
          type: 'bearer',
        },
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // async register({
  //   name,
  //   first_name,
  //   last_name,
  //   email,
  //   password,
  //   type,
  //   phone_number,
  //   profession,
  // }: {
  //   name: string;
  //   first_name?: string;
  //   last_name?: string;
  //   email: string;
  //   password: string;
  //   type?: string;
  //   phone_number: string;
  //   profession?: string;
  // }) {
  //   try {
  //     // Check if email already exist
  //     const userEmailExist = await UserRepository.exist({
  //       field: 'email',
  //       value: String(email),
  //     });

  //     if (userEmailExist) {
  //       return {
  //         statusCode: 401,
  //         message: 'Email already exist',
  //       };
  //     }

  //     const data = {};
  //     if (type) {
  //       data['type'] = type;
  //     }

  //     if (profession) {
  //       data['profession'] = profession;
  //     }

  //     const user = await UserRepository.createUser({
  //       name: name,
  //       email: email,
  //       password: password,
  //       phone_number: phone_number,
  //       ...data,
  //     });

  //     if (user == null && user.success == false) {
  //       return {
  //         success: false,
  //         message: 'Failed to create account',
  //       };
  //     }

  //     // create stripe customer account
  //     const stripeCustomer = await StripePayment.createCustomer({
  //       user_id: user.data.id,
  //       email: email,
  //       name: name,
  //     });

  //     if (stripeCustomer) {
  //       await this.prisma.user.update({
  //         where: {
  //           id: user.data.id,
  //         },
  //         data: {
  //           billing_id: stripeCustomer.id,
  //         },
  //       });
  //     }

  //     // ----------------------------------------------------
  //     // // create otp code
  //     const token = await UcodeRepository.createToken({
  //       userId: user.data.id,
  //       isOtp: true,
  //     });
  //     console.log(token);

  //     // send otp code to email
  //     await this.mailService.sendOtpCodeToEmail({
  //       email: email,
  //       name: name,
  //       otp: token,
  //     });

  //     return {
  //       success: true,
  //       message: 'We have sent an OTP code to your email',
  //     };

  //     // ----------------------------------------------------

  //     // Generate verification token
  //     // const token = await UcodeRepository.createVerificationToken({
  //     //   userId: user.data.id,
  //     //   email: email,
  //     // });

  //     // // Send verification email with token
  //     // await this.mailService.sendVerificationLink({
  //     //   email,
  //     //   name: email,
  //     //   token: token.token,
  //     //   type: type,
  //     // });

  //     return {
  //       success: true,
  //       message: 'We have sent a verification link to your email',
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }

  async register({
    name,
    first_name,
    last_name,
    email,
    password,
    type,
    phone_number,
    profession,
  }: {
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    type?: string;
    phone_number: string;
    profession?: string;
  }) {
    try {
      // Check if email already exist
      const userEmailExist = await UserRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      const data = {};
      if (type) {
        data['type'] = type;
      }

      if (profession) {
        data['profession'] = profession;
      }

      const user = await UserRepository.createUser({
        name: name,
        email: email,
        password: password,
        phone_number: phone_number,
        ...data,
      });

      if (user == null && user.success == false) {
        return {
          success: false,
          message: 'Failed to create account',
        };
      }

      // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: user.data.id,
        email: email,
        name: name,
      });

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.data.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
      }

      // Create default wallet for the user
      await this.prisma.wallet.create({
        data: {
          userId: user.data.id,
          balance: 0, // Default balance is already set in model
          currency: 'USD', // Default currency is already set in model
          // Other fields will use their default values
        },
      });

      // create otp code
      const token = await UcodeRepository.createToken({
        userId: user.data.id,
        isOtp: true,
      });
      console.log(token);

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await UserRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyEmail({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          // await UcodeRepository.deleteToken({
          //   email: email,
          //   token: token,
          // });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await UserRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // --------- 2FA ---------
  async generate2FASecret(user_id: string) {
    try {
      return await UserRepository.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verify2FA(user_id: string, token: string) {
    try {
      const isValid = await UserRepository.verify2FA(user_id, token);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid token',
        };
      }
      return {
        success: true,
        message: '2FA verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async enable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.enable2FA(user_id);
        return {
          success: true,
          message: '2FA enabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async disable2FA(user_id: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        await UserRepository.disable2FA(user_id);
        return {
          success: true,
          message: '2FA disabled successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  // --------- google auth ---------

  // async googleLogin(req) {
  //   if (!req.user) {
  //     return {
  //       success: false,
  //       message: 'No user from google',
  //     };
  //   }

  //   const { email, firstName, lastName, picture, accessToken } = req.user;
  //   const userType = req?.userType || 'user';
  //   // Check if user exists
  //   let user = await this.prisma.user.findUnique({
  //     where: { email },
  //   });

  //   if (!user) {
  //     // Create new user
  //     user = await this.prisma.user.create({
  //       data: {
  //         email,
  //         first_name: firstName,
  //         last_name: lastName,
  //         avatar: picture,
  //         type: userType,
  //         email_verified_at: new Date(),
  //       },
  //     });
  //   }

  //   // Create or update OAuth account
  //   await this.prisma.account.upsert({
  //     where: {
  //       provider_provider_account_id: {
  //         provider: 'google',
  //         provider_account_id: email,
  //       },
  //     },
  //     create: {
  //       user_id: user.id,
  //       type: 'oauth',
  //       provider: 'google',
  //       provider_account_id: email,
  //       access_token: accessToken,
  //     },
  //     update: {
  //       access_token: accessToken,
  //     },
  //   });

  //   // Generate JWT token
  //   const token = this.jwtService.sign({ userId: user.id, email: user.email });

  //   return {
  //     success: true,
  //     data: { user, token },
  //   };
  // }


  async googleLogin({ idToken, userType }: GoogleLoginDto) {
    const decoded = await this.firebase.verifyIdToken(idToken);
    const email = decoded.email;
    const name = decoded.name;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    let token;

    if (existingUser) {
      if (existingUser.type !== userType) {
        throw new BadRequestException(
          `Email already registered as ${existingUser.type}`,
        );
      }
      //const payload = { email: email, sub: userId };
      token = this.jwtService.sign({ sub: existingUser.id, email: existingUser.email });
      const user = await UserRepository.getUserDetails(existingUser.id);
      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          token: token,
          type: 'bearer',
        },
        type: user.type,
      };
      // return {
      //   success: true,
      //   message: 'Logged in successfully',
      //   authorization: {
      //     token: token,        
      //     type: 'bearer',
      //   },
      //   type: existingUser.type,
      // };
    }

    const newUser = await this.prisma.user.create({
      data: { email, 
        name, 
        type: userType,
       email_verified_at: new Date() },
    });

     token = this.jwtService.sign({ sub: newUser.id, email: newUser.email });
    //   return {
    //   success: true,
    //   data: { user: newUser, token },
    // };

    // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: newUser.id,
        email: email,
        name: name,
      });

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: newUser.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
      }

      // Create default wallet for the user
      await this.prisma.wallet.create({
        data: {
          userId: newUser.id,
          balance: 0,
          currency: 'USD',
        },
      });
        const tokenn = await UcodeRepository.createToken({
        userId: newUser.id,
        isOtp: true,
      });


    return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          token: token,
          type: 'bearer',
        },
        type: newUser.type,
      };

    // return { message: 'User created and logged in', user: newUser, token };
  }
  
  // --------- end google auth ---------

  // ... existing code ...

  async approveUser(userId: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          approved_at: "approved",
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'User approved successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          approve_at: user.approved_at,
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to approve user');
    }
  }

}
