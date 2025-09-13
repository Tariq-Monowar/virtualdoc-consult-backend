import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewResponseDto } from './dto/review-response.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'The review has been successfully created.',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    // Add debugging to see what's in the request
    console.log('Request user:', req.user);

    if (!req.user || !req.user.userId) {
      return {
        success: false,
        message: 'User not authenticated properly. Please check your token.',
      };
    }

    return this.reviewService.create(createReviewDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with optional filtering' })
  @ApiQuery({ name: 'service_id', required: false, type: String })
  @ApiQuery({ name: 'reviewer_id', required: false, type: String })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Return all reviews.',
    type: [ReviewResponseDto],
  })
  findAll(
    @Query('service_id') service_id?: string,
    @Query('reviewer_id') reviewer_id?: string,
    @Query('rating') rating?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findAll({
      service_id,
      reviewer_id,
      rating,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the review.',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews by service ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Return reviews for a service.',
    type: [ReviewResponseDto],
  })
  findByServiceId(
    @Param('serviceId') serviceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findByServiceId(serviceId, { page, limit });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews by user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Return reviews by a user.',
    type: [ReviewResponseDto],
  })
  findByUserId(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findByUserId(userId, { page, limit });
  }

  @Get('service/:serviceId/summary')
  @ApiOperation({ summary: 'Get rating summary for a service' })
  @ApiResponse({
    status: 200,
    description: 'Return rating summary for a service.',
  })
  getServiceRatingSummary(@Param('serviceId') serviceId: string) {
    return this.reviewService.getServiceRatingSummary(serviceId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully updated.',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req,
  ) {
    return this.reviewService.update(id, updateReviewDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewService.remove(id, req.user.userId);
  }

  @Get('public/testimonials')
  @ApiOperation({
    summary: 'Get random positive reviews for testimonials (public)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of reviews to return (default: 3)',
  })
  @ApiQuery({
    name: 'min_rating',
    required: false,
    type: Number,
    description: 'Minimum rating (default: 4)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return random positive reviews for testimonials.',
    type: [ReviewResponseDto],
  })
  getTestimonials(
    @Query('limit') limit?: number,
    @Query('min_rating') minRating?: number,
  ) {
    return this.reviewService.getRandomPositiveReviews({
      limit: limit || 3,
      minRating: minRating || 4,
    });
  }
}
