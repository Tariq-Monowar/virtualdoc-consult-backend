import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { CreateAdminDashboardDto } from './dto/create-admin-dashboard.dto';
import { UpdateAdminDashboardDto } from './dto/update-admin-dashboard.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) { }




  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all-coaches')
  async findAllCoachesList() {

    try {
      const response = await this.adminDashboardService.findAllCoaches()
      return response;
    } catch (error) {
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all-clients')
  async findAllClientsList() {

    try {
      const response = await this.adminDashboardService.findAllClients()
      return response;
    } catch (error) {
      throw error;
    }
  }  

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('dashboard-data')
  async findAllDashboardData() {

    try {
      const response = await this.adminDashboardService.admindashboardDData()
      return response;
    } catch (error) {
      throw error;
    }
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('all-appointment')
  async findAllAppointment() {

    try {
      const response = await this.adminDashboardService.findAllAppointment()
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('financial-management')
  async findAllFinancialManagement() {

    try {
      const response = await this.adminDashboardService.findAllFinancialManagement()
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('financial-chart')
  async findAllFinancialChart() {

    try {
      const response = await this.adminDashboardService.findAllFinancialChart()
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('dashboard-pie-chart')
  async dashboardChart() {

    try {
      const response = await this.adminDashboardService.findAllDashboardChart()
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminDashboardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDashboardDto: UpdateAdminDashboardDto) {
    return this.adminDashboardService.update(+id, updateAdminDashboardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminDashboardService.remove(+id);
  }
}
