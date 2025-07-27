# Sơ đồ kiến trúc hệ thống PhotoGo Backend

Đây là sơ đồ tổng quan về các module và sự phụ thuộc trong hệ thống backend của PhotoGo.

```mermaid
graph TB
    subgraph "PhotoGo Backend System"
        subgraph "Core Application Layer"
            AppModule[AppModule]
            AppController[AppController]
            AppService[AppService]
        end

        subgraph "Core Infrastructure"
            ConfigModule[ConfigModule]
            TypeOrmModule[TypeOrmModule]
            MailerModule[MailerModule]
            ScheduleModule[ScheduleModule]
            BullQueueModule[BullQueueModule]
        end

        subgraph "Authentication & Authorization"
            AuthModule[AuthModule]
            JwtAuthGuard[JwtAuthGuard]
            GoogleAuthModule[GoogleAuthModule]
            FacebookAuthModule[FacebookAuthModule]
        end

        subgraph "User Management"
            UserModule[UserModule]
            RoleModule[RoleModule]
            TeamMemberModule[TeamMemberModule]
            VendorModule[VendorModule]
        end

        subgraph "Business Core"
            BookingModule[BookingModule]
            ServicePackageModule[ServicePackageModule]
            CategoryModule[CategoryModule]
            LocationModule[LocationModule]
            LocationAvailabilityModule[LocationAvailabilityModule]
        end

        subgraph "Payment & Financial"
            PaymentModule[PaymentModule]
            PayosModule[PayosModule]
            InvoiceModule[InvoiceModule]
            WalletModule[WalletModule]
            RefundModule[RefundModule]
            CheckoutSessionModule[CheckoutSessionModule]
        end

        subgraph "Marketing & Engagement"
            CampaignModule[CampaignModule]
            VoucherModule[VoucherModule]
            LuckyWheelModule[LuckyWheelModule]
            PointModule[PointModule]
            SubscriptionModule[SubscriptionModule]
        end

        subgraph "Social Features"
            ChatModule[ChatModule]
            CommentModule[CommentModule]
            ReviewModule[ReviewModule]
            AlbumModule[AlbumModule]
        end

        subgraph "Support & Management"
            SupportTicketsModule[SupportTicketsModule]
            NotificationModule[NotificationModule]
            WishlistModule[WishlistModule]
            CartModule[CartModule]
        end

        subgraph "Analytics & Tracking"
            OverviewModule[OverviewModule]
            AttendanceModule[AttendanceModule]
            AttendanceLogModule[AttendanceLogModule]
        end

        subgraph "Third-party Services"
            GeminiModule[GeminiModule]
            GoongModule[GoongModule]
        end

        subgraph "Core Utilities"
            TransformInterceptor[TransformInterceptor]
            TimezoneInterceptor[TimezoneInterceptor]
        end
    end

    %% Dependencies
    AppModule --> ConfigModule
    AppModule --> TypeOrmModule
    AppModule --> MailerModule
    AppModule --> ScheduleModule
    AppModule --> BullQueueModule
    AppModule --> AuthModule
    AppModule --> GoogleAuthModule
    AppModule --> FacebookAuthModule
    AppModule --> UserModule
    AppModule --> RoleModule
    AppModule --> BookingModule
    AppModule --> ServicePackageModule
    AppModule --> PaymentModule
    AppModule --> CampaignModule
    BookingModule --> LocationModule
    BookingModule --> ServicePackageModule
    PaymentModule --> PayosModule
    PaymentModule --> InvoiceModule
    CampaignModule --> VoucherModule
    CampaignModule --> PointModule
    UserModule --> RoleModule
    VendorModule --> UserModule
    TeamMemberModule --> UserModule
    ChatModule --> UserModule
    CommentModule --> UserModule
    ReviewModule --> UserModule
    AlbumModule --> UserModule
    SupportTicketsModule --> UserModule
    NotificationModule --> UserModule
    WishlistModule --> UserModule
    CartModule --> UserModule
    OverviewModule --> UserModule
    AttendanceModule --> UserModule
    AttendanceLogModule --> AttendanceModule
    GeminiModule --> UserModule
    GoongModule --> LocationModule
    AppModule --> TransformInterceptor
    AppModule --> TimezoneInterceptor
    AppModule --> JwtAuthGuard

    %% Styling
    classDef coreModule fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef authModule fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef businessModule fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef paymentModule fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef socialModule fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef supportModule fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef analyticsModule fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    classDef thirdPartyModule fill:#fafafa,stroke:#424242,stroke-width:2px
    classDef utilityModule fill:#f5f5f5,stroke:#212121,stroke-width:2px

    class AppModule,AppController,AppService coreModule
    class ConfigModule,TypeOrmModule,MailerModule,ScheduleModule,BullQueueModule coreModule
    class AuthModule,JwtAuthGuard,GoogleAuthModule,FacebookAuthModule authModule
    class BookingModule,ServicePackageModule,CategoryModule,LocationModule,LocationAvailabilityModule businessModule
    class PaymentModule,PayosModule,InvoiceModule,WalletModule,RefundModule,CheckoutSessionModule paymentModule
    class ChatModule,CommentModule,ReviewModule,AlbumModule socialModule
    class SupportTicketsModule,NotificationModule,WishlistModule,CartModule supportModule
    class OverviewModule,AttendanceModule,AttendanceLogModule analyticsModule
    class GeminiModule,GoongModule thirdPartyModule
    class TransformInterceptor,TimezoneInterceptor utilityModule