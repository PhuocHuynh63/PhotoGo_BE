import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { OverviewDto } from './dto/overview.dto';
import { AdminOverviewDto } from './dto/overview.dto';
import { PaymentService } from '../payments/payment.service';
import { InvoiceService } from '../invoices/invoice.service';
import { BookingService } from '../bookings/booking.service';
import { CommissionService } from '../commission/commission.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionPlanService } from '../subscription/subscription-plan.service';
import { SubscriptionPaymentService } from '../subscription/subscription-payment.service';
import { SubscriptionHistoryService } from '../subscription/subscription-history.service';
import { SubscriptionVendorService } from '../subscription/subscription-vendor.service';
import { BookingStatus } from '../../constants/booking.enum';
import * as ExcelJS from 'exceljs';
import { OverviewType, AdminStatisticsType } from 'src/constants/overview.enum';
import { SubscriptionStatus, BillingCycle, PlanType } from '../../constants/subscription.enum';
import { In, Between } from 'typeorm';
import { VendorService } from '../vendors/vendor.service';

@Injectable()
export class OverviewService {
  constructor(
    private readonly paymentsService: PaymentService,
    private readonly invoicesService: InvoiceService,
    private readonly bookingService: BookingService,
    private readonly commissionService: CommissionService,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly subscriptionVendorService: SubscriptionVendorService,
    private readonly vendorService: VendorService,
  ) {}

  /**
   * Chuyển đổi từ DD/MM/YYYY sang YYYY-MM-DD
   * @param dateString - Chuỗi ngày tháng định dạng DD/MM/YYYY
   * @returns Chuỗi ngày tháng định dạng YYYY-MM-DD
   */
  private convertDDMMYYYYToYYYYMMDD(dateString: string): string {
    if (!dateString || dateString.trim() === '') return '';
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return '';
    
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    
    // Validate date parts
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Chuyển đổi từ YYYY-MM-DD sang DD/MM/YYYY
   * @param dateString - Chuỗi ngày tháng định dạng YYYY-MM-DD
   * @returns Chuỗi ngày tháng định dạng DD/MM/YYYY
   */
  private convertYYYYMMDDToDDMMYYYY(dateString: string): string {
    if (!dateString || dateString.trim() === '') return '';
    
    const parts = dateString.split('-');
    if (parts.length !== 3) return '';
    
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    // Validate date parts
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return '';
    
    return `${day}/${month}/${year}`;
  }

      async getStatistics(query: OverviewDto) {
      if (query.type === OverviewType.FINANCE) {
        return this.getFinanceStatistics(query);
      }
      
      if (query.type === OverviewType.BOOKING) {
        return this.getBookingStatistics(query);
      }
      
      if (query.type === OverviewType.SUBSCRIPTION) {
        return this.getSubscriptionStatistics(query);
      }
      
      return {
        message: 'Statistics endpoint - implementation pending',
        query,
      };
    }

      async exportToExcel(query: OverviewDto, res: Response) {
      if (query.type === OverviewType.FINANCE) {
        return this.exportFinanceToExcel(query, res);
      }
      
      if (query.type === OverviewType.BOOKING) {
        return this.exportBookingToExcel(query, res);
      }
      
      if (query.type === OverviewType.SUBSCRIPTION) {
        return this.exportSubscriptionToExcel(query, res);
      }
      
      return {
        message: 'Excel export endpoint - implementation pending',
        query,
      };
    }

  async getAdminStatistics(query: AdminOverviewDto) {
    if (!query.type || query.type === AdminStatisticsType.ALL || query.type === AdminStatisticsType.COMMISSION) {
      return this.getAdminCommissionStatistics(query);
    }
    if (query.type === AdminStatisticsType.STUDIO_PACKAGE) {
      return this.getAdminStudioSubscriptionStatistics(query);
    }
    if (query.type === AdminStatisticsType.USER_PACKAGE) {
      return this.getAdminUserSubscriptionStatistics(query);
    }
    if (query.type === AdminStatisticsType.PAYMENT) {
      return this.getAdminVendorPaymentStatistics(query);
    }
    // TODO: Xử lý các loại khác (Hoàn tiền)
    return {
      message: 'Admin statistics endpoint - implementation pending',
      query,
    };
  }

  private async getAdminCommissionStatistics(query: AdminOverviewDto) {
    // Lấy ngày đầu năm và cuối năm hiện tại
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Lọc booking theo các trạng thái đã thanh toán, đã xác nhận, đang thực hiện, đã hoàn thành trong năm
    const validStatuses = [
      BookingStatus.PAID,
      BookingStatus.CONFIRMED,
      BookingStatus.PROGRESSING,
      BookingStatus.COMPLETED,
    ];
    const allBookings = await this.bookingService['bookingRepository'].find({
      where: {
        status: In(validStatuses),
        date: Between(startDate, endDate),
      },
      relations: ['serviceConcept'],
    });

    // Lấy tất cả commission, map theo serviceConceptId
    const commissions = await this.commissionService.findAll();
    const commissionMap = new Map();
    commissions.forEach(c => commissionMap.set(c.serviceConceptId, c));

    // Tính tổng hoa hồng và tổng booking chỉ với booking COMPLETED
    const completedBookings = allBookings.filter(b => b.status === BookingStatus.COMPLETED);
    let totalCommission = 0;
    for (const booking of completedBookings) {
      const commission = commissionMap.get(booking.serviceConceptId);
      if (!commission) continue;
      const commissionAmount = commission.commissionAmount || 0;
      totalCommission += commissionAmount;
    }
    const totalBookings = completedBookings.length;

    // Format số booking
    const totalBookingsFormatted = totalBookings.toLocaleString('en-US');
    // Format hoa hồng rút gọn
    const totalCommissionShort = totalCommission >= 1_000_000 ? `${Math.round(totalCommission / 1_000_000)} Tr đ` : `${totalCommission.toLocaleString('en-US')} đ`;

    // Thống kê hoa hồng từng tháng
    const monthlyCommission = Array(12).fill(0);

    // Khởi tạo breakdown cho từng status
    const statusBreakdown = {
      [BookingStatus.PAID]: { totalBookings: 0, totalCommission: 0 },
      [BookingStatus.CONFIRMED]: { totalBookings: 0, totalCommission: 0 },
      [BookingStatus.PROGRESSING]: { totalBookings: 0, totalCommission: 0 },
      [BookingStatus.COMPLETED]: { totalBookings: 0, totalCommission: 0 },
    };

    for (const booking of allBookings) {
      const commission = commissionMap.get(booking.serviceConceptId);
      if (!commission) continue;
      const commissionAmount = commission.commissionAmount || 0;
      // Tính theo tháng
      const bookingDate = new Date(booking.date);
      const monthIdx = bookingDate.getMonth(); // 0-11
      monthlyCommission[monthIdx] += commissionAmount;
      // Breakdown theo status
      if (statusBreakdown[booking.status]) {
        statusBreakdown[booking.status].totalBookings++;
        statusBreakdown[booking.status].totalCommission += commissionAmount;
      }
    }

    // Làm tròn breakdown
    Object.values(statusBreakdown).forEach(bd => {
      bd.totalCommission = Math.round(bd.totalCommission);
    });

    // Tính tổng doanh thu từng tháng để tính rate
    const monthlyRevenue = Array(12).fill(0);
    for (const booking of allBookings) {
      const bookingDate = new Date(booking.date);
      const monthIdx = bookingDate.getMonth();
      const originPrice = parseFloat(booking.serviceConcept?.price as any) || 0;
      monthlyRevenue[monthIdx] += originPrice;
    }
    const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
    const commissionRate = totalRevenue > 0 ? Math.round((totalCommission / totalRevenue) * 100) : 0;

    // Chuẩn hóa monthlyCommission response
    let prevCommission = 0;
    const monthlyCommissionArr = monthlyCommission.map((commission, idx) => {
      const revenue = monthlyRevenue[idx];
      const rate = revenue > 0 ? Math.round((commission / revenue) * 100) : 0;
      const growthRate = prevCommission > 0 ? Math.round(((commission - prevCommission) / prevCommission) * 100) : 0;
      const result = { month: idx + 1, commission: Math.round(commission), rate, growthRate };
      prevCommission = commission;
      return result;
    });

    // Chuẩn hóa statusBreakdown response
    const statusArr = Object.entries(statusBreakdown).map(([status, bd]) => {
      // Tính tổng revenue cho status này
      const revenue = allBookings.filter(b => b.status === status).reduce((sum, b) => sum + (parseFloat(b.serviceConcept?.price as any) || 0), 0);
      const rate = revenue > 0 ? Math.round((bd.totalCommission / revenue) * 100) : 0;
      return {
        status,
        totalBookings: bd.totalBookings,
        totalCommission: bd.totalCommission,
        rate,
      };
    });

    return {
      summary: {
        totalBookings,
        totalBookingsFormatted,
        totalCommission: Math.round(totalCommission),
        totalCommissionShort,
        commissionRate,
      },
      monthlyCommission: monthlyCommissionArr,
      statusBreakdown: statusArr,
    };
  }

  async getDashboardData() {
    return {
      message: 'Dashboard data endpoint - implementation pending',
    };
  }

  private async getFinanceStatistics(query: OverviewDto) {
    // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
    const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
    const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
    
    const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1); // Start of year
    const endDate = endDateString ? new Date(endDateString) : new Date(new Date().getFullYear(), 11, 31); // Current date

    // Get all payments and invoices for the date range
    const paymentsResponse = await this.paymentsService.findAll({
      current: 1,
      pageSize: 1000, // Get all payments
    });

    const invoicesResponse = await this.invoicesService.findAll({
      current: '1',
      pageSize: '1000', // Get all invoices
    });

    // Get commission data
    const commissions = await this.commissionService.getCommissionStatistics(startDate, endDate);

    const payments = paymentsResponse.data;
    const invoices = invoicesResponse.data;

    // Filter payments by date range
    let filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startDate && paymentDate <= endDate;
    });

    // Filter invoices by date range
    let filteredInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.issuedAt);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });

    // Filter by vendorId/locationId if provided
    if (query.vendorId) {
      filteredPayments = filteredPayments.filter(payment => {
        // payment.invoice?.booking?.location?.vendor?.id hoặc payment.invoice?.booking?.serviceConcept?.servicePackage?.vendorId
        return (
          payment.invoice?.booking?.location?.vendor?.id === query.vendorId ||
          payment.invoice?.booking?.serviceConcept?.servicePackage?.vendorId === query.vendorId
        );
      });
      filteredInvoices = filteredInvoices.filter(invoice => {
        return (
          invoice.booking?.location?.vendor?.id === query.vendorId ||
          invoice.booking?.serviceConcept?.servicePackage?.vendorId === query.vendorId
        );
      });
    }
    if (query.locationId) {
      filteredPayments = filteredPayments.filter(payment => payment.invoice?.booking?.locationId === query.locationId);
      filteredInvoices = filteredInvoices.filter(invoice => invoice.booking?.locationId === query.locationId);
    }

    // Calculate total revenue (sum of all paid payments, excluding refunds)
    const totalRevenue = filteredPayments
      .filter(payment => payment.status === 'đã hoàn thành')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Calculate pending payments (sum of pending payments)
    const pendingPayments = filteredPayments
      .filter(payment => payment.status === 'chờ xử lý')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Calculate invoice statistics
    const pendingInvoices = filteredInvoices
      .filter(invoice => invoice.status === 'chờ thanh toán')
      .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

    const partiallyPaidInvoices = filteredInvoices
      .filter(invoice => invoice.status === 'đã thanh toán một phần')
      .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

    const paidInvoices = filteredInvoices
      .filter(invoice => invoice.status === 'đã thanh toán')
      .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

    const cancelledInvoices = filteredInvoices
      .filter(invoice => invoice.status === 'đã hủy')
      .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

    // Calculate commission statistics
    const totalCommissionAmount = commissions.reduce((sum, commission) => {
      return sum + (commission.commissionAmount || 0);
    }, 0);

    const percentageCommissions = commissions.filter(commission => 
      commission.commissionType === 'phần trăm'
    ).reduce((sum, commission) => sum + (commission.commissionAmount || 0), 0);

    const fixedCommissions = commissions.filter(commission => 
      commission.commissionType === 'cố định'
    ).reduce((sum, commission) => sum + (commission.commissionAmount || 0), 0);

    // Calculate monthly revenue for chart
    const monthlyRevenue = this.calculateMonthlyRevenue(filteredPayments, startDate, endDate);

    // Calculate financial info for current month
    const currentMonth = new Date();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Calculate last month for comparison
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const currentMonthPayments = filteredPayments.filter(payment => 
      payment.status === 'đã hoàn thành' &&
      payment.createdAt >= currentMonthStart &&
      payment.createdAt <= currentMonthEnd
    );

    const lastMonthPayments = filteredPayments.filter(payment => 
      payment.status === 'đã hoàn thành' &&
      payment.createdAt >= lastMonthStart &&
      payment.createdAt <= lastMonthEnd
    );

    const thisMonthRevenue = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    // Calculate profit based on actual commission data
    // Profit = Revenue - Commission - Tax - Other costs
    const taxRate = 0.05; // 5% tax
    
    // Use actual commission amount for current month
    const currentMonthCommissions = commissions.filter(commission => {
      const commissionDate = new Date(commission.created_at);
      return commissionDate >= currentMonthStart && commissionDate <= currentMonthEnd;
    });
    
    const thisMonthCommissionAmount = currentMonthCommissions.reduce((sum, commission) => 
      sum + (commission.commissionAmount || 0), 0
    );
    
    const taxAmount = Math.round(thisMonthRevenue * taxRate);
    
    // Calculate profit (revenue - commission - tax)
    const thisMonthProfit = thisMonthRevenue - thisMonthCommissionAmount - taxAmount;
    
    // Calculate last month profit for comparison
    const lastMonthCommissions = commissions.filter(commission => {
      const commissionDate = new Date(commission.created_at);
      return commissionDate >= lastMonthStart && commissionDate <= lastMonthEnd;
    });
    
    const lastMonthCommissionAmount = lastMonthCommissions.reduce((sum, commission) => 
      sum + (commission.commissionAmount || 0), 0
    );
    const lastMonthTaxAmount = Math.round(lastMonthRevenue * taxRate);
    const lastMonthProfit = lastMonthRevenue - lastMonthCommissionAmount - lastMonthTaxAmount;
    
    // Calculate profit ratio as percentage
    const profitRatio = thisMonthRevenue > 0 ? Math.round((thisMonthProfit / thisMonthRevenue) * 100) : 0;
    
    // Calculate growth percentages
    const revenueGrowth = lastMonthRevenue > 0 ? 
      Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 * 10) / 10 : 0;
    
    const profitGrowth = lastMonthProfit > 0 ? 
      Math.round(((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100 * 10) / 10 : 0;

    // Get recent transactions (last 5 successful payments)
    const recentTransactions = filteredPayments
      .filter(payment => payment.status === 'đã hoàn thành')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(payment => ({
        id: payment.id,
        description: payment.description || 'Thanh toán',
        amount: Number(payment.amount),
        date: payment.createdAt,
        status: payment.status,
      }));

    // Get unpaid invoices
    const unpaidInvoices = filteredInvoices
      .filter(invoice => invoice.status === 'chờ thanh toán' || invoice.status === 'đã thanh toán một phần')
      .slice(0, 3)
      .map(invoice => ({
        id: invoice.id,
        customerName: `Khách hàng ${invoice.id.slice(0, 8)}`, // Placeholder for customer name
        dueDate: invoice.issuedAt,
        amount: invoice.payablePrice,
        status: invoice.status,
      }));

    return {
      totalRevenue,
      pendingPayments,
      monthlyRevenue,
      commissionStatistics: {
        totalCommissionAmount,
        percentageCommissions,
        fixedCommissions,
        thisMonthCommissionAmount,
      },
      invoiceStatistics: {
        pendingInvoices,
        partiallyPaidInvoices,
        paidInvoices,
        cancelledInvoices,
      },
      financialInfo: {
        thisMonthRevenue,
        thisMonthProfit,
        profitRatio,
        taxRate: 5, // Fixed 5% tax rate
        revenueGrowth, // Tăng trưởng doanh thu so với tháng trước
        profitGrowth, // Tăng trưởng lợi nhuận so với tháng trước
      },
      recentTransactions,
      unpaidInvoices,
    };
  }

  private calculateMonthlyRevenue(payments: any[], startDate: Date, endDate: Date) {
    const monthlyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthPayments = payments.filter(payment => 
        payment.status === 'đã hoàn thành' &&
        payment.createdAt >= monthStart &&
        payment.createdAt <= monthEnd
      );
      
      const monthRevenue = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      monthlyData.push({
        month: currentDate.getMonth() + 1, // 1-12
        monthName: `T${currentDate.getMonth() + 1}`,
        revenue: monthRevenue,
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return monthlyData;
  }

  private async exportFinanceToExcel(query: OverviewDto, res: Response) {
    try {
      // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
      const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
      const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
      
      const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateString ? new Date(endDateString) : new Date();

      // Get data
      const paymentsResponse = await this.paymentsService.findAll({
        current: 1,
        pageSize: 1000,
      });

      const invoicesResponse = await this.invoicesService.findAll({
        current: '1',
        pageSize: '1000',
      });

      // Get commission data
      const commissions = await this.commissionService.getCommissionStatistics(startDate, endDate);

      let filteredPayments = paymentsResponse.data;
      let filteredInvoices = invoicesResponse.data;

      // Filter by date range
      filteredPayments = filteredPayments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      });

      filteredInvoices = filteredInvoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issuedAt);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });

      // Filter by vendorId/locationId if provided
      if (query.vendorId) {
        filteredPayments = filteredPayments.filter(payment => {
          return (
            payment.invoice?.booking?.location?.vendor?.id === query.vendorId ||
            payment.invoice?.booking?.serviceConcept?.servicePackage?.vendorId === query.vendorId
          );
        });
        filteredInvoices = filteredInvoices.filter(invoice => {
          return (
            invoice.booking?.location?.vendor?.id === query.vendorId ||
            invoice.booking?.serviceConcept?.servicePackage?.vendorId === query.vendorId
          );
        });
      }
      if (query.locationId) {
        filteredPayments = filteredPayments.filter(payment => payment.invoice?.booking?.locationId === query.locationId);
        filteredInvoices = filteredInvoices.filter(invoice => invoice.booking?.locationId === query.locationId);
      }

      // Create workbook with multiple sheets
      const workbook = new ExcelJS.Workbook();

      // ===== SHEET 1: PAYMENTS =====
      const paymentsSheet = workbook.addWorksheet('Thanh toán');
      
      // Set up payments headers
      paymentsSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Mô tả', key: 'description', width: 40 },
        { header: 'Loại', key: 'type', width: 15 },
        { header: 'Số tiền (VNĐ)', key: 'amount', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Phương thức', key: 'method', width: 15 },
        { header: 'Mã giao dịch', key: 'transactionId', width: 25 },
      ];

      // Style for payments header
      const paymentsHeaderRow = paymentsSheet.getRow(1);
      paymentsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      paymentsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      paymentsHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add payments data
      let paymentsRowNumber = 1;
      filteredPayments.forEach((payment, index) => {
        paymentsRowNumber++;
        paymentsSheet.addRow({
          stt: index + 1,
          date: this.formatDate(payment.createdAt),
          description: payment.description || 'Thanh toán',
          type: payment.type,
          amount: payment.amount.toLocaleString('vi-VN'),
          status: payment.status,
          method: payment.paymentMethod,
          transactionId: payment.transactionId || 'N/A',
        });
      });

      // Add payments summary
      paymentsRowNumber += 2;
      paymentsSheet.addRow(['TỔNG KẾT THANH TOÁN']);
      const paymentsSummaryRow = paymentsSheet.getRow(paymentsRowNumber);
      paymentsSummaryRow.font = { bold: true, size: 14 };
      paymentsSummaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };

      // Calculate payments totals
      const totalRevenue = filteredPayments
        .filter(p => p.status === 'đã hoàn thành')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPending = filteredPayments
        .filter(p => p.status === 'chờ xử lý')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalFailed = filteredPayments
        .filter(p => p.status === 'thất bại')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Tổng doanh thu:', '', '', totalRevenue.toLocaleString('vi-VN'), 'đã hoàn thành', '', '']);
      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Thanh toán đang chờ:', '', '', totalPending.toLocaleString('vi-VN'), 'chờ xử lý', '', '']);
      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Thanh toán thất bại:', '', '', totalFailed.toLocaleString('vi-VN'), 'thất bại', '', '']);

      // ===== SHEET 2: COMMISSION =====
      const commissionSheet = workbook.addWorksheet('Hoa hồng');
      
      // Set up commission headers
      commissionSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày tạo', key: 'date', width: 15 },
        { header: 'Loại hoa hồng', key: 'type', width: 20 },
        { header: 'Tỷ lệ (%)', key: 'rate', width: 15 },
        { header: 'Số tiền (VNĐ)', key: 'amount', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];

      // Style for commission header
      const commissionHeaderRow = commissionSheet.getRow(1);
      commissionHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      commissionHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      commissionHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add commission data
      let commissionRowNumber = 1;
      commissions.forEach((commission, index) => {
        commissionRowNumber++;
        commissionSheet.addRow({
          stt: index + 1,
          date: this.formatDate(commission.created_at),
          type: commission.commissionType,
          rate: commission.commissionRate,
          amount: (commission.commissionAmount || 0).toLocaleString('vi-VN'),
          status: commission.status,
        });
      });

      // Add commission summary
      commissionRowNumber += 2;
      commissionSheet.addRow(['TỔNG KẾT HOA HỒNG']);
      const commissionSummaryRow = commissionSheet.getRow(commissionRowNumber);
      commissionSummaryRow.font = { bold: true, size: 14 };
      commissionSummaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };

      // Calculate commission totals
      const totalCommissionAmount = commissions.reduce((sum, commission) => 
        sum + (commission.commissionAmount || 0), 0
      );

      const percentageCommissions = commissions.filter(commission => 
        commission.commissionType === 'phần trăm'
      ).reduce((sum, commission) => sum + (commission.commissionAmount || 0), 0);

      const fixedCommissions = commissions.filter(commission => 
        commission.commissionType === 'cố định'
      ).reduce((sum, commission) => sum + (commission.commissionAmount || 0), 0);

      commissionRowNumber++;
      commissionSheet.addRow(['', 'Tổng hoa hồng:', '', '', totalCommissionAmount.toLocaleString('vi-VN'), '']);
      commissionRowNumber++;
      commissionSheet.addRow(['', 'Hoa hồng theo phần trăm:', '', '', percentageCommissions.toLocaleString('vi-VN'), '']);
      commissionRowNumber++;
      commissionSheet.addRow(['', 'Hoa hồng cố định:', '', '', fixedCommissions.toLocaleString('vi-VN'), '']);

      // ===== SHEET 3: INVOICES =====
      const invoicesSheet = workbook.addWorksheet('Hóa đơn');
      
      // Set up invoices headers
      invoicesSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày tạo', key: 'date', width: 15 },
        { header: 'Mã hóa đơn', key: 'invoiceId', width: 25 },
        { header: 'Số tiền (VNĐ)', key: 'amount', width: 20 },
        { header: 'Đã thanh toán', key: 'paid', width: 20 },
        { header: 'Còn lại', key: 'remaining', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];

      // Style for invoices header
      const invoicesHeaderRow = invoicesSheet.getRow(1);
      invoicesHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      invoicesHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD32F2F' }
      };
      invoicesHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add invoices data
      let invoicesRowNumber = 1;
      filteredInvoices.forEach((invoice, index) => {
        invoicesRowNumber++;
        invoicesSheet.addRow({
          stt: index + 1,
          date: this.formatDate(invoice.issuedAt),
          invoiceId: invoice.id,
          amount: invoice.payablePrice.toLocaleString('vi-VN'),
          paid: invoice.paidAmount.toLocaleString('vi-VN'),
          remaining: (invoice.payablePrice - invoice.paidAmount).toLocaleString('vi-VN'),
          status: invoice.status,
        });
      });

      // Add invoices summary
      invoicesRowNumber += 2;
      invoicesSheet.addRow(['TỔNG KẾT HÓA ĐƠN']);
      const invoicesSummaryRow = invoicesSheet.getRow(invoicesRowNumber);
      invoicesSummaryRow.font = { bold: true, size: 14 };
      invoicesSummaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };

      // Calculate invoices totals
      const pendingInvoices = filteredInvoices
        .filter(invoice => invoice.status === 'chờ thanh toán')
        .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

      const partiallyPaidInvoices = filteredInvoices
        .filter(invoice => invoice.status === 'đã thanh toán một phần')
        .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

      const paidInvoices = filteredInvoices
        .filter(invoice => invoice.status === 'đã thanh toán')
        .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

      const cancelledInvoices = filteredInvoices
        .filter(invoice => invoice.status === 'đã hủy')
        .reduce((sum, invoice) => sum + Number(invoice.payablePrice), 0);

      invoicesRowNumber++;
      invoicesSheet.addRow(['', 'Hóa đơn chờ thanh toán:', '', pendingInvoices.toLocaleString('vi-VN'), '', '', '']);
      invoicesRowNumber++;
      invoicesSheet.addRow(['', 'Hóa đơn đã thanh toán một phần:', '', partiallyPaidInvoices.toLocaleString('vi-VN'), '', '', '']);
      invoicesRowNumber++;
      invoicesSheet.addRow(['', 'Hóa đơn đã thanh toán:', '', paidInvoices.toLocaleString('vi-VN'), '', '', '']);
      invoicesRowNumber++;
      invoicesSheet.addRow(['', 'Hóa đơn đã hủy:', '', cancelledInvoices.toLocaleString('vi-VN'), '', '', '']);

      // Set response headers
      const fileName = `bao-cao-tai-chinh-${this.formatDate(new Date())}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting Excel:', error);
      res.status(500).json({
        message: 'Lỗi khi xuất file Excel',
        error: error.message,
      });
    }
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const yyyyMMdd = `${year}-${month}-${day}`;
    return this.convertYYYYMMDDToDDMMYYYY(yyyyMMdd);
  }

  private async getBookingStatistics(query: OverviewDto) {
    // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
    const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
    const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
    
    const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = endDateString ? new Date(endDateString) : new Date(new Date().getFullYear(), 11, 31); // Đến cuối năm

    // Get all bookings for the date range
    const bookingsResponse = await this.bookingService.findAll({
      current: 1,
      pageSize: 1000,
    });

    const bookings = bookingsResponse.data;

    // Filter bookings by date range
    let filteredBookings = bookings.filter(booking => {
      // Kiểm tra nếu booking.date là null hoặc invalid
      if (!booking.date) {
        return false; // Bỏ qua booking không có date
      }
      
      let bookingDate;
      
      // Xử lý format date DD/MM/YYYY
      if (typeof booking.date === 'string' && (booking.date as string).includes('/')) {
        const parts = (booking.date as string).split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);
          bookingDate = new Date(year, month, day);
        } else {
          bookingDate = new Date(booking.date);
        }
      } else {
        bookingDate = new Date(booking.date);
      }
      
      // Kiểm tra nếu date không hợp lệ
      if (isNaN(bookingDate.getTime())) {
        return false; // Bỏ qua booking có date không hợp lệ
      }
      
      // Reset time to start of day for accurate comparison
      const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return bookingDateOnly >= startDateOnly && bookingDateOnly <= endDateOnly;
    });

    // Filter by vendorId/locationId if provided
    if (query.vendorId) {
      filteredBookings = filteredBookings.filter(booking => {
        return (
          booking.location?.vendor?.id === query.vendorId ||
          booking.serviceConcept?.servicePackage?.vendorId === query.vendorId
        );
      });
    }
    if (query.locationId) {
      filteredBookings = filteredBookings.filter(booking => booking.locationId === query.locationId);
    }

    // Calculate total appointments
    const totalAppointments = filteredBookings.length;

    // Calculate completed appointments
    const completedAppointments = filteredBookings.filter(booking => 
      booking.status === BookingStatus.COMPLETED
    ).length;

    // Calculate cancelled appointments
    const cancelledAppointments = filteredBookings.filter(booking => 
      booking.status === BookingStatus.CANCELLED || 
      booking.status === BookingStatus.CANCELLED_TIMEOUT ||
      booking.status === BookingStatus.CANCELLED_USER ||
      booking.status === BookingStatus.CANCELLED_VENDOR
    ).length;

    // Calculate pending appointments
    const pendingAppointments = filteredBookings.filter(booking => 
      booking.status === BookingStatus.PENDING
    ).length;

    // Calculate confirmed appointments
    const confirmedAppointments = filteredBookings.filter(booking => 
      booking.status === BookingStatus.CONFIRMED
    ).length;

    // Calculate paid appointments
    const paidAppointments = filteredBookings.filter(booking => 
      booking.status === BookingStatus.PAID
    ).length;

    // Calculate percentages
    const completedPercentage = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
    const cancelledPercentage = totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0;
    const pendingPercentage = totalAppointments > 0 ? Math.round((pendingAppointments / totalAppointments) * 100) : 0;
    const confirmedPercentage = totalAppointments > 0 ? Math.round((confirmedAppointments / totalAppointments) * 100) : 0;
    const paidPercentage = totalAppointments > 0 ? Math.round((paidAppointments / totalAppointments) * 100) : 0;

    // For now, set average rating to 0 since booking entity doesn't have rating field
    // TODO: Implement rating calculation when review system is available
    const averageRating = 0;

    // Calculate monthly bookings for chart
    const monthlyBookings = this.calculateMonthlyBookings(filteredBookings, startDate, endDate);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      confirmedAppointments,
      paidAppointments,
      completedPercentage,
      cancelledPercentage,
      pendingPercentage,
      confirmedPercentage,
      paidPercentage,
      averageRating,
      monthlyBookings,
      // Chi tiết từng loại status
      statusBreakdown: {
        notPaid: filteredBookings.filter(b => b.status === BookingStatus.NOT_PAID).length,
        paid: filteredBookings.filter(b => b.status === BookingStatus.PAID).length,
        pending: filteredBookings.filter(b => b.status === BookingStatus.PENDING).length,
        confirmed: filteredBookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
        progressing: filteredBookings.filter(b => b.status === BookingStatus.PROGRESSING).length,
        completed: filteredBookings.filter(b => b.status === BookingStatus.COMPLETED).length,
        cancelled: filteredBookings.filter(b => b.status === BookingStatus.CANCELLED).length,
        cancelledTimeout: filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_TIMEOUT).length,
        cancelledUser: filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_USER).length,
        cancelledVendor: filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_VENDOR).length,
      }
    };
  }

  private calculateMonthlyBookings(bookings: any[], startDate: Date, endDate: Date) {
    const monthlyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthBookings = bookings.filter(booking => {
        // Xử lý format date DD/MM/YYYY giống như trong filter chính
        let bookingDate;
        if (typeof booking.date === 'string' && (booking.date as string).includes('/')) {
          const parts = (booking.date as string).split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            bookingDate = new Date(year, month, day);
          } else {
            bookingDate = new Date(booking.date);
          }
        } else {
          bookingDate = new Date(booking.date);
        }
        
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });
      
      monthlyData.push({
        month: currentDate.getMonth() + 1,
        monthName: `Tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`,
        count: monthBookings.length,
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return monthlyData;
  }

  private async getSubscriptionStatistics(query: OverviewDto) {
    try {
      // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
      const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
      const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
      const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateString ? new Date(endDateString) : new Date();

      // Get subscription plans (kéo lên trước)
      const plans = await this.subscriptionPlanService.findAll({});
      const planList = plans.data;

      // Get all subscriptions
      const subscriptionsResponse = await this.subscriptionService.findAll({
        current: 1,
        pageSize: 1000,
      });
      let filteredSubscriptions = subscriptionsResponse.data;
      // Filter subscriptions by date range (created date)
      filteredSubscriptions = filteredSubscriptions.filter(subscription => {
        const subscriptionDate = new Date(subscription.createdAt);
        return subscriptionDate >= startDate && subscriptionDate <= endDate;
      });
      // Filter by vendorId if provided (join qua plan.subscriptionVendors)
      if (query.vendorId) {
        const plansOfVendor = planList.filter(plan =>
          plan.subscriptionVendors && plan.subscriptionVendors.some(v => v.vendorId === query.vendorId)
        ).map(plan => plan.id);
        filteredSubscriptions = filteredSubscriptions.filter(sub => plansOfVendor.includes(sub.planId));
      }

      // Calculate basic statistics
      const totalSubscriptions = filteredSubscriptions.length;
      const activeSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length;
      const canceledSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.CANCELED).length;
      const expiredSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length;

      // Calculate revenue from subscription payments - using repository directly
      const subscriptionPayments = await this.subscriptionPaymentService['subscriptionPaymentRepository'].find({
        relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      });
      let filteredPayments = subscriptionPayments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate && payment.status === 'đã hoàn thành';
      });
      // Filter by vendorId/locationId if provided
      if (query.vendorId) {
        const plansOfVendor = planList.filter(plan =>
          plan.subscriptionVendors && plan.subscriptionVendors.some(v => v.vendorId === query.vendorId)
        ).map(plan => plan.id);
        const subscriptionIdsOfVendor = filteredSubscriptions.filter(sub => plansOfVendor.includes(sub.planId)).map(sub => sub.id);
        filteredPayments = filteredPayments.filter(payment => payment.subscriptionInvoice?.subscription && subscriptionIdsOfVendor.includes(payment.subscriptionInvoice.subscription.id));
      }
      // Không filter locationId vì subscription không có location

      const totalRevenue = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      // Calculate retention rate (subscriptions that were renewed)
      const renewedSubscriptions = filteredSubscriptions.filter(s => 
        s.status === SubscriptionStatus.ACTIVE && s.endDate > new Date()
      ).length;

      const retentionRate = totalSubscriptions > 0 ? Math.round((renewedSubscriptions / totalSubscriptions) * 100) : 0;

      // Calculate churn rate
      const churnRate = totalSubscriptions > 0 ? Math.round(((canceledSubscriptions + expiredSubscriptions) / totalSubscriptions) * 100) : 0;

      // Statistics by plan
      const planStats = planList.map(plan => {
        const planSubscriptions = filteredSubscriptions.filter(s => s.planId === plan.id);
        const planRevenue = filteredPayments
          .filter(payment => {
            // Find subscription for this payment
            const subscription = filteredSubscriptions.find(s => 
              s.invoices?.some(invoice => 
                invoice.payments?.some(p => p.id === payment.id)
              )
            );
            return subscription?.planId === plan.id;
          })
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        return {
          planId: plan.id,
          planName: plan.name,
          planType: plan.planType,
          subscriptionCount: planSubscriptions.length,
          revenue: planRevenue,
          activeCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
          canceledCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.CANCELED).length,
          expiredCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length,
        };
      });

      // Statistics by billing cycle
      const monthlySubscriptions = filteredSubscriptions.filter(s => s.billingCycle === BillingCycle.MONTHLY).length;
      const yearlySubscriptions = filteredSubscriptions.filter(s => s.billingCycle === BillingCycle.YEARLY).length;

      // Monthly statistics
      const monthlyStats = this.calculateMonthlySubscriptionStats(filteredSubscriptions, startDate, endDate);

      return {
        summary: {
          totalSubscriptions,
          activeSubscriptions,
          canceledSubscriptions,
          expiredSubscriptions,
          totalRevenue: totalRevenue,
          retentionRate,
          churnRate,
          monthlySubscriptions,
          yearlySubscriptions,
        },
        planStats,
        monthlyStats,
        dateRange: {
          startDate: this.convertYYYYMMDDToDDMMYYYY(startDate.toISOString().split('T')[0]),
          endDate: this.convertYYYYMMDDToDDMMYYYY(endDate.toISOString().split('T')[0]),
        },
      };
    } catch (error) {
      console.error('Error getting subscription statistics:', error);
      throw error;
    }
  }

  private calculateMonthlySubscriptionStats(subscriptions: any[], startDate: Date, endDate: Date) {
    const monthlyData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const monthSubscriptions = subscriptions.filter(subscription => {
        const subscriptionDate = new Date(subscription.createdAt);
        return subscriptionDate >= monthStart && subscriptionDate <= monthEnd;
      });

      monthlyData.push({
        month: currentDate.getMonth() + 1,
        monthName: `Tháng ${currentDate.getMonth() + 1} ${currentDate.getFullYear()}`,
        newSubscriptions: monthSubscriptions.length,
        activeSubscriptions: monthSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
        canceledSubscriptions: monthSubscriptions.filter(s => s.status === SubscriptionStatus.CANCELED).length,
        expiredSubscriptions: monthSubscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthlyData;
  }

  private async exportSubscriptionToExcel(query: OverviewDto, res: Response) {
    try {
      // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
      const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
      const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
      const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateString ? new Date(endDateString) : new Date();

      // Get subscription plans (kéo lên trước)
      const plans = await this.subscriptionPlanService.findAll({});
      const planList = plans.data;

      // Get all data
      const subscriptionsResponse = await this.subscriptionService.findAll({
        current: 1,
        pageSize: 1000,
      });
      const subscriptionPayments = await this.subscriptionPaymentService['subscriptionPaymentRepository'].find({
        relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      });
      const subscriptionHistory = await this.subscriptionHistoryService['subscriptionHistoryRepository'].find({
        relations: ['subscription'],
      });
      let filteredSubscriptions = subscriptionsResponse.data;
      filteredSubscriptions = filteredSubscriptions.filter(subscription => {
        const subscriptionDate = new Date(subscription.createdAt);
        return subscriptionDate >= startDate && subscriptionDate <= endDate;
      });
      if (query.vendorId) {
        const plansOfVendor = planList.filter(plan =>
          plan.subscriptionVendors && plan.subscriptionVendors.some(v => v.vendorId === query.vendorId)
        ).map(plan => plan.id);
        filteredSubscriptions = filteredSubscriptions.filter(sub => plansOfVendor.includes(sub.planId));
      }
      let filteredPayments = subscriptionPayments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
      if (query.vendorId) {
        const plansOfVendor = planList.filter(plan =>
          plan.subscriptionVendors && plan.subscriptionVendors.some(v => v.vendorId === query.vendorId)
        ).map(plan => plan.id);
        const subscriptionIdsOfVendor = filteredSubscriptions.filter(sub => plansOfVendor.includes(sub.planId)).map(sub => sub.id);
        filteredPayments = filteredPayments.filter(payment => payment.subscriptionInvoice?.subscription && subscriptionIdsOfVendor.includes(payment.subscriptionInvoice.subscription.id));
      }
      // Không filter locationId vì subscription không có location

      const subscriptions = filteredSubscriptions;
      const payments = filteredPayments;
      const history = subscriptionHistory;

      // Create workbook with multiple sheets
      const workbook = new ExcelJS.Workbook();

      // ===== SHEET 1: SUBSCRIPTION OVERVIEW =====
      const overviewSheet = workbook.addWorksheet('Tổng quan Subscription');
      
      // Set up overview headers
      overviewSheet.columns = [
        { header: 'Chỉ số', key: 'metric', width: 30 },
        { header: 'Giá trị', key: 'value', width: 20 },
        { header: 'Mô tả', key: 'description', width: 40 },
      ];

      // Style for overview header
      const overviewHeaderRow = overviewSheet.getRow(1);
      overviewHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      overviewHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      overviewHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Calculate overview statistics
      const totalSubscriptions = filteredSubscriptions.length;
      const activeSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length;
      const canceledSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.CANCELED).length;
      const expiredSubscriptions = filteredSubscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length;
      const totalRevenue = filteredPayments
        .filter(p => p.status === 'đã hoàn thành')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const retentionRate = totalSubscriptions > 0 ? Math.round((activeSubscriptions / totalSubscriptions) * 100) : 0;
      const churnRate = totalSubscriptions > 0 ? Math.round(((canceledSubscriptions + expiredSubscriptions) / totalSubscriptions) * 100) : 0;

      // Add overview data
      let overviewRowNumber = 1;
      const overviewData = [
        { metric: 'Tổng số subscription', value: totalSubscriptions, description: 'Tổng số subscription trong khoảng thời gian' },
        { metric: 'Subscription đang hoạt động', value: activeSubscriptions, description: 'Số subscription có trạng thái hoạt động' },
        { metric: 'Subscription đã hủy', value: canceledSubscriptions, description: 'Số subscription đã bị hủy' },
        { metric: 'Subscription hết hạn', value: expiredSubscriptions, description: 'Số subscription đã hết hạn' },
        { metric: 'Tổng doanh thu', value: totalRevenue.toLocaleString('vi-VN') + ' VNĐ', description: 'Tổng doanh thu từ subscription' },
        { metric: 'Tỷ lệ retention', value: retentionRate + '%', description: 'Tỷ lệ subscription được giữ lại' },
        { metric: 'Tỷ lệ churn', value: churnRate + '%', description: 'Tỷ lệ subscription bị mất' },
      ];

      overviewData.forEach((data) => {
        overviewRowNumber++;
        overviewSheet.addRow({
          metric: data.metric,
          value: data.value,
          description: data.description,
        });
      });

      // ===== SHEET 2: SUBSCRIPTION DETAILS =====
      const detailsSheet = workbook.addWorksheet('Chi tiết Subscription');
      
      // Set up details headers
      detailsSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Mã subscription', key: 'id', width: 25 },
        { header: 'Ngày tạo', key: 'createdAt', width: 15 },
        { header: 'Ngày bắt đầu', key: 'startDate', width: 15 },
        { header: 'Ngày kết thúc', key: 'endDate', width: 15 },
        { header: 'Tên gói', key: 'planName', width: 25 },
        { header: 'Loại gói', key: 'planType', width: 15 },
        { header: 'Chu kỳ thanh toán', key: 'billingCycle', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Ngày thanh toán tiếp theo', key: 'nextBillingAt', width: 20 },
      ];

      // Style for details header
      const detailsHeaderRow = detailsSheet.getRow(1);
      detailsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      detailsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      detailsHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add subscription details data
      let detailsRowNumber = 1;
      filteredSubscriptions.forEach((subscription, index) => {
        const plan = planList.find(p => p.id === subscription.planId);
        detailsRowNumber++;
        detailsSheet.addRow({
          stt: index + 1,
          id: subscription.id,
          createdAt: this.formatDate(subscription.createdAt),
          startDate: this.formatDate(subscription.startDate),
          endDate: this.formatDate(subscription.endDate),
          planName: plan?.name || 'N/A',
          planType: plan?.planType || 'N/A',
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          nextBillingAt: subscription.nextBillingAt ? this.formatDate(subscription.nextBillingAt) : 'N/A',
        });
      });

      // ===== SHEET 3: SUBSCRIPTION PAYMENTS =====
      const paymentsSheet = workbook.addWorksheet('Thanh toán Subscription');
      
      // Set up payments headers
      paymentsSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày thanh toán', key: 'createdAt', width: 15 },
        { header: 'Mã thanh toán', key: 'id', width: 25 },
        { header: 'Số tiền (VNĐ)', key: 'amount', width: 20 },
        { header: 'Phương thức', key: 'paymentMethod', width: 15 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Loại thanh toán', key: 'type', width: 15 },
        { header: 'Mô tả', key: 'description', width: 30 },
      ];

      // Style for payments header
      const paymentsHeaderRow = paymentsSheet.getRow(1);
      paymentsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      paymentsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD32F2F' }
      };
      paymentsHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add payments data
      let paymentsRowNumber = 1;
      filteredPayments.forEach((payment, index) => {
        paymentsRowNumber++;
        paymentsSheet.addRow({
          stt: index + 1,
          createdAt: this.formatDate(payment.createdAt),
          id: payment.id,
          amount: payment.amount.toLocaleString('vi-VN'),
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          type: payment.type,
          description: payment.description || 'N/A',
        });
      });

      // Add payments summary
      paymentsRowNumber += 2;
      paymentsSheet.addRow(['TỔNG KẾT THANH TOÁN']);
      const paymentsSummaryRow = paymentsSheet.getRow(paymentsRowNumber);
      paymentsSummaryRow.font = { bold: true, size: 14 };
      paymentsSummaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };

      const successfulPayments = filteredPayments.filter(p => p.status === 'đã hoàn thành');
      const pendingPayments = filteredPayments.filter(p => p.status === 'chờ xử lý');
      const failedPayments = filteredPayments.filter(p => p.status === 'thất bại');

      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Thanh toán thành công:', '', successfulPayments.length, '', '', '', '']);
      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Thanh toán đang chờ:', '', pendingPayments.length, '', '', '', '']);
      paymentsRowNumber++;
      paymentsSheet.addRow(['', 'Thanh toán thất bại:', '', failedPayments.length, '', '', '', '']);

      // ===== SHEET 4: PLAN ANALYSIS =====
      const planSheet = workbook.addWorksheet('Phân tích Gói');
      
      // Set up plan headers
      planSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Tên gói', key: 'planName', width: 25 },
        { header: 'Loại gói', key: 'planType', width: 15 },
        { header: 'Số subscription', key: 'subscriptionCount', width: 15 },
        { header: 'Đang hoạt động', key: 'activeCount', width: 15 },
        { header: 'Đã hủy', key: 'canceledCount', width: 15 },
        { header: 'Hết hạn', key: 'expiredCount', width: 15 },
        { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 20 },
      ];

      // Style for plan header
      const planHeaderRow = planSheet.getRow(1);
      planHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      planHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9C27B0' }
      };
      planHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Calculate plan statistics
      const planStats = planList.map(plan => {
        const planSubscriptions = filteredSubscriptions.filter(s => s.planId === plan.id);
        const planRevenue = filteredPayments
          .filter(payment => {
            // Find subscription for this payment
            const subscription = filteredSubscriptions.find(s => 
              s.invoices?.some(invoice => 
                invoice.payments?.some(p => p.id === payment.id)
              )
            );
            return subscription?.planId === plan.id;
          })
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        return {
          planId: plan.id,
          planName: plan.name,
          planType: plan.planType,
          subscriptionCount: planSubscriptions.length,
          revenue: planRevenue,
          activeCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
          canceledCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.CANCELED).length,
          expiredCount: planSubscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length,
        };
      });

      // Add plan data
      let planRowNumber = 1;
      planStats.forEach((plan, index) => {
        planRowNumber++;
        planSheet.addRow({
          stt: index + 1,
          planName: plan.planName,
          planType: plan.planType,
          subscriptionCount: plan.subscriptionCount,
          activeCount: plan.activeCount,
          canceledCount: plan.canceledCount,
          expiredCount: plan.expiredCount,
          revenue: plan.revenue.toLocaleString('vi-VN'),
        });
      });

      // ===== SHEET 5: SUBSCRIPTION HISTORY =====
      const historySheet = workbook.addWorksheet('Lịch sử Subscription');
      
      // Set up history headers
      historySheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Ngày', key: 'createdAt', width: 15 },
        { header: 'Hành động', key: 'action', width: 20 },
        { header: 'Mô tả', key: 'description', width: 40 },
        { header: 'Loại người trả', key: 'payerType', width: 15 },
      ];

      // Style for history header
      const historyHeaderRow = historySheet.getRow(1);
      historyHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      historyHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF9800' }
      };
      historyHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add history data
      let historyRowNumber = 1;
      history.forEach((hist, index) => {
        historyRowNumber++;
        historySheet.addRow({
          stt: index + 1,
          createdAt: this.formatDate(hist.createdAt),
          action: hist.action,
          description: hist.description || 'N/A',
          payerType: hist.payerType,
        });
      });

      // Set response headers
      const fileName = `bao-cao-subscription-${this.formatDate(new Date())}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting subscription Excel:', error);
      res.status(500).json({
        message: 'Lỗi khi xuất file Excel',
        error: error.message,
      });
    }
  }

  private async exportBookingToExcel(query: OverviewDto, res: Response) {
    try {
      // Convert UI date format (DD/MM/YYYY) to system format (YYYY-MM-DD) for processing
      const startDateString = query.startDate ? this.convertDDMMYYYYToYYYYMMDD(query.startDate) : '';
      const endDateString = query.endDate ? this.convertDDMMYYYYToYYYYMMDD(query.endDate) : '';
      
      const startDate = startDateString ? new Date(startDateString) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateString ? new Date(endDateString) : new Date();

      // Get all bookings for the date range
      const bookingsResponse = await this.bookingService.findAll({
        current: 1,
        pageSize: 1000,
      });

      let filteredBookings = bookingsResponse.data;

      // Filter bookings by date range
      filteredBookings = filteredBookings.filter(booking => {
        // Xử lý format date DD/MM/YYYY
        let bookingDate;
        if (typeof booking.date === 'string' && (booking.date as string).includes('/')) {
          const parts = (booking.date as string).split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            bookingDate = new Date(year, month, day);
          } else {
            bookingDate = new Date(booking.date);
          }
        } else {
          bookingDate = new Date(booking.date);
        }
        
        return bookingDate >= startDate && bookingDate <= endDate;
      });

      // Filter by vendorId/locationId if provided
      if (query.vendorId) {
        filteredBookings = filteredBookings.filter(booking => {
          return (
            booking.location?.vendor?.id === query.vendorId ||
            booking.serviceConcept?.servicePackage?.vendorId === query.vendorId
          );
        });
      }
      if (query.locationId) {
        filteredBookings = filteredBookings.filter(booking => booking.locationId === query.locationId);
      }

      // Create workbook with multiple sheets
      const workbook = new ExcelJS.Workbook();

      // ===== SHEET 1: BOOKING DETAILS =====
      const bookingDetailsSheet = workbook.addWorksheet('Chi tiết lịch hẹn');

      // Set up booking details headers
      bookingDetailsSheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Mã lịch hẹn', key: 'code', width: 15 },
        { header: 'Ngày hẹn', key: 'date', width: 15 },
        { header: 'Giờ hẹn', key: 'time', width: 10 },
        { header: 'Khách hàng', key: 'customer', width: 25 },
        { header: 'Số điện thoại', key: 'phone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Trạng thái', key: 'status', width: 20 },
        { header: 'Loại nguồn', key: 'sourceType', width: 15 },
        { header: 'Ghi chú', key: 'note', width: 30 },
      ];

      // Style for booking details header
      const bookingDetailsHeaderRow = bookingDetailsSheet.getRow(1);
      bookingDetailsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      bookingDetailsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      bookingDetailsHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add booking details data
      let bookingDetailsRowNumber = 1;
      filteredBookings.forEach((booking, index) => {
        bookingDetailsRowNumber++;
        bookingDetailsSheet.addRow({
          stt: index + 1,
          code: booking.code || 'N/A',
          date: this.formatDate(booking.date),
          time: booking.time || 'N/A',
          customer: booking.fullName || 'N/A',
          phone: booking.phone || 'N/A',
          email: booking.email || 'N/A',
          status: booking.status,
          sourceType: booking.sourceType,
          note: booking.userNote || 'N/A',
        });
      });

      // ===== SHEET 2: BOOKING SUMMARY =====
      const bookingSummarySheet = workbook.addWorksheet('Tổng kết lịch hẹn');

      // Set up booking summary headers
      bookingSummarySheet.columns = [
        { header: 'Chỉ số', key: 'metric', width: 30 },
        { header: 'Số lượng', key: 'count', width: 15 },
        { header: 'Tỷ lệ (%)', key: 'percentage', width: 15 },
      ];

      // Style for booking summary header
      const bookingSummaryHeaderRow = bookingSummarySheet.getRow(1);
      bookingSummaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      bookingSummaryHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      bookingSummaryHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Calculate totals
      const totalBookings = filteredBookings.length;
      const completedBookings = filteredBookings.filter(b => b.status === BookingStatus.COMPLETED).length;
      const cancelledBookings = filteredBookings.filter(b => 
        b.status === BookingStatus.CANCELLED || 
        b.status === BookingStatus.CANCELLED_TIMEOUT ||
        b.status === BookingStatus.CANCELLED_USER ||
        b.status === BookingStatus.CANCELLED_VENDOR
      ).length;
      const pendingBookings = filteredBookings.filter(b => 
        b.status === BookingStatus.PENDING
      ).length;
      const confirmedBookings = filteredBookings.filter(b => 
        b.status === BookingStatus.CONFIRMED
      ).length;
      const paidBookings = filteredBookings.filter(b => 
        b.status === BookingStatus.PAID
      ).length;

      // Add booking summary data
      let bookingSummaryRowNumber = 1;
      const summaryData = [
        { metric: 'Tổng số lịch hẹn', count: totalBookings, percentage: 100 },
        { metric: 'Lịch hẹn hoàn thành', count: completedBookings, percentage: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0 },
        { metric: 'Lịch hẹn đã thanh toán', count: paidBookings, percentage: totalBookings > 0 ? Math.round((paidBookings / totalBookings) * 100) : 0 },
        { metric: 'Lịch hẹn đã xác nhận', count: confirmedBookings, percentage: totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0 },
        { metric: 'Lịch hẹn đang chờ', count: pendingBookings, percentage: totalBookings > 0 ? Math.round((pendingBookings / totalBookings) * 100) : 0 },
        { metric: 'Lịch hẹn đã hủy', count: cancelledBookings, percentage: totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0 },
      ];

      summaryData.forEach((data) => {
        bookingSummaryRowNumber++;
        bookingSummarySheet.addRow({
          metric: data.metric,
          count: data.count,
          percentage: `${data.percentage}%`,
        });
      });

      // ===== SHEET 3: STATUS BREAKDOWN =====
      const statusBreakdownSheet = workbook.addWorksheet('Chi tiết trạng thái');

      // Set up status breakdown headers
      statusBreakdownSheet.columns = [
        { header: 'Trạng thái', key: 'status', width: 25 },
        { header: 'Số lượng', key: 'count', width: 15 },
        { header: 'Tỷ lệ (%)', key: 'percentage', width: 15 },
      ];

      // Style for status breakdown header
      const statusBreakdownHeaderRow = statusBreakdownSheet.getRow(1);
      statusBreakdownHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      statusBreakdownHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD32F2F' }
      };
      statusBreakdownHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add status breakdown data
      let statusBreakdownRowNumber = 1;
      const statusCounts = {
        'Chưa thanh toán': filteredBookings.filter(b => b.status === BookingStatus.NOT_PAID).length,
        'Đã thanh toán': filteredBookings.filter(b => b.status === BookingStatus.PAID).length,
        'Chờ xác nhận': filteredBookings.filter(b => b.status === BookingStatus.PENDING).length,
        'Đã xác nhận': filteredBookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
        'Đang thực hiện': filteredBookings.filter(b => b.status === BookingStatus.PROGRESSING).length,
        'Đã hoàn thành': filteredBookings.filter(b => b.status === BookingStatus.COMPLETED).length,
        'Đã hủy': filteredBookings.filter(b => b.status === BookingStatus.CANCELLED).length,
        'Đã hủy - quá hạn': filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_TIMEOUT).length,
        'Đã hủy - người dùng': filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_USER).length,
        'Đã hủy - vendor': filteredBookings.filter(b => b.status === BookingStatus.CANCELLED_VENDOR).length,
      };

      Object.entries(statusCounts).forEach(([status, count]) => {
        statusBreakdownRowNumber++;
        const percentage = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
        statusBreakdownSheet.addRow({
          status: status,
          count: count,
          percentage: `${percentage}%`,
        });
      });

      // Set response headers
      const fileName = `bao-cao-lich-hen-${this.formatDate(new Date())}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting booking Excel:', error);
      res.status(500).json({
        message: 'Lỗi khi xuất file Excel',
        error: error.message,
      });
    }
  }

  private async getAdminStudioSubscriptionStatistics(query: AdminOverviewDto) {
    // 1. Lấy tất cả plan có planType === 'nhà cung cấp'
    const planRes = await this.subscriptionPlanService.findAll({ planType: PlanType.VENDOR, pageSize: 1000 });
    const studioPlans = planRes.data;
    const studioPlanIds = studioPlans.map(p => p.id);

    // 2. Lấy tất cả subscription vendor có planId thuộc các plan này
    // (Giả sử có thể lấy hết, nếu nhiều thì cần phân trang)
    const allVendors = await this.subscriptionVendorService.findAll();
    const studioVendors = allVendors.filter(v => studioPlanIds.includes(v.planId));

    // 3. Tính toán
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthlyCount = Array(12).fill(0);
    const monthlyRevenue = Array(12).fill(0);
    const statusBreakdown: Record<string, { totalVendors: number }> = {};
    let totalRevenue = 0;
    let totalVendors = studioVendors.length;

    for (const vendor of studioVendors) {
      // Tính theo tháng
      const joinedDate = new Date(vendor.joinedDate);
      if (joinedDate.getFullYear() === currentYear) {
        monthlyCount[joinedDate.getMonth()]++;
        const plan = studioPlans.find(p => p.id === vendor.planId);
        if (plan) {
          monthlyRevenue[joinedDate.getMonth()] += Number(plan.priceForMonth || 0);
        }
      }
      // Tính breakdown theo trạng thái
      const status = vendor.isActive ? 'active' : 'inactive';
      if (!statusBreakdown[status]) statusBreakdown[status] = { totalVendors: 0 };
      statusBreakdown[status].totalVendors++;
      // Tính doanh thu (giả sử lấy giá tháng đầu tiên của plan)
      const plan = studioPlans.find(p => p.id === vendor.planId);
      if (plan) {
        totalRevenue += Number(plan.priceForMonth || 0);
      }
    }

    // Format
    const totalVendorsFormatted = totalVendors.toLocaleString('en-US');
    const totalRevenueShort = totalRevenue >= 1_000_000 ? `${Math.round(totalRevenue / 1_000_000)} Tr đ` : `${totalRevenue.toLocaleString('en-US')} đ`;

    // Chuẩn hóa monthly với growthRateVendor và growthRateRevenue
    const monthlyArr = monthlyCount.map((count, idx) => {
      let growthRateVendor = 0;
      let growthRateRevenue = 0;
      if (idx > 0 && monthlyCount[idx - 1] > 0) {
        growthRateVendor = Math.round(((count - monthlyCount[idx - 1]) / monthlyCount[idx - 1]) * 100);
      } else if (idx > 0 && monthlyCount[idx - 1] === 0 && count > 0) {
        growthRateVendor = 100;
      } else {
        growthRateVendor = 0;
      }
      if (idx > 0 && monthlyRevenue[idx - 1] > 0) {
        growthRateRevenue = Math.round(((monthlyRevenue[idx] - monthlyRevenue[idx - 1]) / monthlyRevenue[idx - 1]) * 100);
      } else if (idx > 0 && monthlyRevenue[idx - 1] === 0 && monthlyRevenue[idx] > 0) {
        growthRateRevenue = 100;
      } else {
        growthRateRevenue = 0;
      }
      return { month: idx + 1, newVendors: count, revenue: monthlyRevenue[idx], growthRateVendor, growthRateRevenue };
    });
    // Chuẩn hóa statusBreakdown
    const statusArr = Object.entries(statusBreakdown).map(([status, bd]) => ({ status, totalVendors: bd.totalVendors }));

    return {
      summary: {
        totalVendors,
        totalVendorsFormatted,
        totalRevenue: Math.round(totalRevenue),
        totalRevenueShort,
      },
      monthly: monthlyArr,
      statusBreakdown: statusArr,
    };
  }

  private async getAdminUserSubscriptionStatistics(query: AdminOverviewDto) {
    // 1. Lấy tất cả plan có planType === 'người dùng'
    const planRes = await this.subscriptionPlanService.findAll({ planType: PlanType.USER, pageSize: 1000 });
    const userPlans = planRes.data;
    const userPlanIds = userPlans.map(p => p.id);

    // 2. Lấy tất cả subscription có planId thuộc các plan này và có userId
    const subscriptionsRes = await this.subscriptionService.findAll({ pageSize: 1000 });
    const allSubscriptions = subscriptionsRes.data.filter(s => userPlanIds.includes(s.planId) && s.userId);

    // 3. Lấy tổng số user trong hệ thống
    const userService = this['userService'] || (this as any).userService;
    let totalUsersAll = 0;
    if (userService && typeof userService.findAll === 'function') {
      const usersRes = await userService.findAll({ pageSize: 1_000_000 });
      totalUsersAll = usersRes.pagination?.totalItem || usersRes.data?.length || 0;
    }

    // 4. Tính toán
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthlyCount = Array(12).fill(0);
    const monthlyRevenue = Array(12).fill(0);
    const statusBreakdown: Record<string, { totalUsers: number }> = {};
    let totalRevenue = 0;
    let totalUsers = 0;

    for (const sub of allSubscriptions) {
      // Tính theo tháng
      const createdDate = new Date(sub.createdAt || sub.startDate);
      if (createdDate.getFullYear() === currentYear) {
        monthlyCount[createdDate.getMonth()]++;
        // Doanh thu (giả sử lấy giá tháng đầu tiên của plan)
        const plan = userPlans.find(p => p.id === sub.planId);
        if (plan) {
          monthlyRevenue[createdDate.getMonth()] += Number(plan.priceForMonth || 0);
        }
      }
      // Breakdown theo trạng thái
      const status = sub.status;
      if (!statusBreakdown[status]) statusBreakdown[status] = { totalUsers: 0 };
      statusBreakdown[status].totalUsers++;
      // Tổng doanh thu
      const plan = userPlans.find(p => p.id === sub.planId);
      if (plan) {
        totalRevenue += Number(plan.priceForMonth || 0);
      }
    }
    totalUsers = allSubscriptions.length;

    // Format
    const totalUsersFormatted = totalUsers.toLocaleString('en-US');
    const totalRevenueShort = totalRevenue >= 1_000_000 ? `${Math.round(totalRevenue / 1_000_000)} Tr đ` : `${totalRevenue.toLocaleString('en-US')} đ`;
    const subscriptionRate = totalUsersAll > 0 ? Math.round((totalUsers / totalUsersAll) * 100) : 0;

    // Chuẩn hóa monthly với growthRateUser và growthRateRevenue
    const monthlyArr = monthlyCount.map((count, idx) => {
      let growthRateUser = 0;
      let growthRateRevenue = 0;
      if (idx > 0 && monthlyCount[idx - 1] > 0) {
        growthRateUser = Math.round(((count - monthlyCount[idx - 1]) / monthlyCount[idx - 1]) * 100);
      } else if (idx > 0 && monthlyCount[idx - 1] === 0 && count > 0) {
        growthRateUser = 100;
      } else {
        growthRateUser = 0;
      }
      if (idx > 0 && monthlyRevenue[idx - 1] > 0) {
        growthRateRevenue = Math.round(((monthlyRevenue[idx] - monthlyRevenue[idx - 1]) / monthlyRevenue[idx - 1]) * 100);
      } else if (idx > 0 && monthlyRevenue[idx - 1] === 0 && monthlyRevenue[idx] > 0) {
        growthRateRevenue = 100;
      } else {
        growthRateRevenue = 0;
      }
      return { month: idx + 1, newUsers: count, revenue: monthlyRevenue[idx], growthRateUser, growthRateRevenue };
    });
    // Chuẩn hóa statusBreakdown
    const statusArr = Object.entries(statusBreakdown).map(([status, bd]) => ({ status, totalUsers: bd.totalUsers }));

    return {
      summary: {
        totalUsers,
        totalUsersFormatted,
        totalRevenue: Math.round(totalRevenue),
        totalRevenueShort,
        subscriptionRate,
      },
      monthly: monthlyArr,
      statusBreakdown: statusArr,
    };
  }

  private async getAdminVendorPaymentStatistics(query: AdminOverviewDto) {
    // Thống kê số tiền cần thanh toán cho vendor theo tháng
    // 1. Lấy năm cần thống kê
    const year = query.year ? Number(query.year) : new Date().getFullYear();
    const current = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    // 2. Lấy tất cả booking completed trong năm đó
    const allBookingsRes = await this.bookingService['bookingRepository'].find({
      where: {
        status: BookingStatus.COMPLETED,
        date: Between(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999)),
      },
      relations: [
        'location',
        'location.vendor',
        'serviceConcept',
        'serviceConcept.servicePackage',
      ],
    });
    // 3. Lấy tất cả vendor
    const allVendorsRes = await this.vendorService.findAll({ pageSize: pageSize.toString() });
    const allVendorsList = allVendorsRes.data;
    // 4. Gom nhóm booking theo vendorId, theo tháng
    const vendorBookingMap = new Map(); // vendorId -> { monthly: [12], total }
    for (const booking of allBookingsRes) {
      const vendor = booking.location?.vendor;
      if (!vendor) continue;
      const vendorId = vendor.id;
      const month = new Date(booking.date).getMonth(); // 0-11
      const originPrice = Number(booking.serviceConcept?.price || 0);
      if (!vendorBookingMap.has(vendorId)) {
        vendorBookingMap.set(vendorId, {
          monthly: Array(12).fill(0),
          total: 0,
        });
      }
      const v = vendorBookingMap.get(vendorId);
      v.monthly[month] += originPrice;
      v.total += originPrice;
    }
    // 5. Merge tất cả vendor với dữ liệu booking
    const allVendors = allVendorsList.map(vendor => {
      const bookingData = vendorBookingMap.get(vendor.id) || { monthly: Array(12).fill(0), total: 0 };
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        monthly: bookingData.monthly.map((amount, idx) => ({ month: (idx + 1).toString(), amount })),
        total: Math.round(bookingData.total),
      };
    });
    // 6. Phân trang
    const totalItem = allVendors.length;
    const totalPage = Math.ceil(totalItem / pageSize);
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    const vendors = allVendors.slice(start, end);
    return {
      year,
      vendors,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
} 