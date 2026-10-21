Restaurant SaaS Platform
Software Requirements & Architecture Documentation
Document 01 — Product Vision & Scope
Document Status: Draft
Version: 1.0
Project Type: Multi-Tenant SaaS Platform
Primary Domain: Restaurant Management, Digital Menu & Online Ordering
________________________________________
1. Product Overview
The Restaurant SaaS Platform is a multi-tenant Software as a Service (SaaS) platform that enables restaurants to create, customize, and operate their own branded online presence without developing and maintaining a separate software system.
The platform provides restaurants with a centralized dashboard through which they can manage their restaurant profile, menu, website appearance, staff, QR menu, and customer orders.
Each restaurant operates as an independent tenant within the platform. Although multiple restaurants share the same application infrastructure, each tenant's data, users, configuration, menu, and orders must remain logically isolated from every other tenant.
The platform will provide a reusable website engine where restaurants can configure predefined templates and branding options rather than requiring a separate website application for each restaurant.
________________________________________
2. Product Vision
Build a scalable multi-tenant SaaS platform that enables restaurants to quickly establish and operate their own branded digital presence, digital menu, QR menu, and online ordering system through a single centralized platform.
The platform should make the process simple:
Restaurant Owner
      ↓
Register
      ↓
Create Restaurant
      ↓
Configure Restaurant
      ↓
Add Menu
      ↓
Customize Website
      ↓
Publish
      ↓
Customers Visit Website
      ↓
Customers Place Orders
      ↓
Restaurant Receives Orders
      ↓
Restaurant Processes Orders
________________________________________
3. Problem Statement
Small and medium-sized restaurants often require several digital services:
•	Restaurant website
•	Digital menu
•	QR menu
•	Online ordering
•	Restaurant branding
•	Menu management
•	Order management
•	Customer-facing website
•	Kitchen order notifications
Developing and maintaining these systems independently can require significant development cost, technical expertise, and ongoing maintenance.
The Restaurant SaaS Platform addresses this problem by providing these capabilities through one reusable software platform.
Instead of developing an independent system for every restaurant:
Restaurant A → Custom Development
Restaurant B → Custom Development
Restaurant C → Custom Development
the platform provides:
                    Restaurant SaaS
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
        Restaurant A  Restaurant B  Restaurant C
             │            │            │
             ↓            ↓            ↓
        Website A     Website B     Website C
Each restaurant receives an independently configurable experience while the underlying application remains shared.
________________________________________
4. Product Objectives
The primary objectives of the platform are:
1.	Provide restaurants with an easy-to-use digital platform.
2.	Support multiple independent restaurants within one SaaS application.
3.	Maintain strict tenant data isolation.
4.	Allow restaurants to manage their menus without developer involvement.
5.	Allow restaurants to customize their public website using predefined templates and configuration.
6.	Provide customers with a fast and responsive digital menu.
7.	Support online ordering.
8.	Provide restaurants with real-time order notifications.
9.	Provide QR-based access to restaurant menus.
10.	Establish an architecture that can scale as the number of restaurants increases.
11.	Provide a foundation for subscription-based SaaS monetization.
________________________________________
5. Target Market
5.1 Primary Market
The initial target market consists of small and medium-sized restaurants that need an affordable digital presence.
Examples include:
•	Fast-food restaurants
•	Pizza restaurants
•	Burger restaurants
•	Cafés
•	Bakeries
•	Dessert shops
•	Local restaurants
•	Takeaway businesses
•	Cloud kitchens
5.2 Future Market
The platform may later support:
•	Restaurant chains
•	Multi-branch restaurants
•	Food courts
•	Catering businesses
•	Larger restaurant organizations
Multi-branch support is not part of the initial V1 scope.
________________________________________
6. Product Users
The initial product recognizes four major categories of users.
6.1 Platform Administrator
The Platform Administrator represents the company operating the SaaS platform.
The administrator manages the platform itself, including:
•	Restaurants/Tenants
•	Platform users
•	Subscription plans
•	Subscriptions
•	Templates
•	Platform configuration
•	Platform-level reporting
Detailed administrator permissions will be defined in the Stakeholders, Actors & Roles document.
________________________________________
6.2 Restaurant Owner
The Restaurant Owner is the primary SaaS customer.
The owner manages:
•	Restaurant profile
•	Restaurant settings
•	Website configuration
•	Menu
•	Menu categories
•	Menu items
•	Orders
•	Restaurant staff
•	QR menu
•	Subscription information
________________________________________
6.3 Restaurant Staff
Restaurant staff operate the restaurant's daily activities.
Examples include:
•	Manager
•	Kitchen Staff
•	Cashier
•	Waiter
Staff access will be controlled through role-based and potentially permission-based authorization.
________________________________________
6.4 Customer
The Customer is the end user of a restaurant's public website.
The customer can:
•	Visit the restaurant website
•	Browse the menu
•	View menu categories
•	View food items
•	Add items to a cart
•	Checkout
•	Place an order
•	View order status where supported
A customer account is not required for the initial V1 ordering flow unless later requirements introduce one.
________________________________________
7. SaaS Model
The platform follows a multi-tenant SaaS architecture.
One application serves multiple restaurants:
                         SaaS Platform
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
    Tenant A              Tenant B              Tenant C
        │                     │                     │
        ↓                     ↓                     ↓
 Pizza Palace            Burger House           Green Cafe
Each tenant has its own logical data boundary.
For example:
Tenant A
 ├── Restaurant Profile
 ├── Users
 ├── Menu
 ├── Orders
 └── Settings

Tenant B
 ├── Restaurant Profile
 ├── Users
 ├── Menu
 ├── Orders
 └── Settings
Tenant A must never be able to access or manipulate Tenant B's data.
________________________________________
8. Multi-Tenancy Strategy
The initial architecture will use:
Single Database + Shared Tables + TenantId
Tenant-owned database records will contain a TenantId.
Example:
MenuItems
------------------------------------------------
Id | TenantId | Name        | Price
------------------------------------------------
1  | 1        | Pizza       | 10.00
2  | 1        | Pasta       | 12.00
3  | 2        | Burger      | 8.00
4  | 2        | Fries       | 4.00
The application will determine the current tenant from the incoming request and use that tenant context throughout the request lifecycle.
EF Core Global Query Filters will be used where appropriate to provide automatic tenant filtering.
Tenant isolation will be treated as a security boundary, not merely a database filtering technique.
________________________________________
9. Core Product Capabilities
The V1 platform will contain the following major capabilities.
9.1 Tenant Management
The platform will support:
•	Restaurant registration
•	Tenant creation
•	Tenant activation/deactivation
•	Tenant configuration
•	Tenant isolation
________________________________________
9.2 Authentication & Authorization
The platform will support:
•	User registration
•	Login
•	Password management
•	Authentication
•	Role-based authorization
•	Tenant-aware authorization
________________________________________
9.3 Restaurant Management
Restaurant owners will be able to manage:
•	Restaurant name
•	Logo
•	Description
•	Contact information
•	Address
•	Opening hours
•	Social media information
•	Other restaurant configuration
________________________________________
9.4 Menu Management
Restaurants will be able to manage:
•	Menu categories
•	Menu items
•	Item names
•	Descriptions
•	Prices
•	Images
•	Availability
•	Display ordering
Example:
Menu
├── Starters
├── Main Course
├── Pizza
├── Burgers
├── Drinks
└── Desserts
________________________________________
9.5 Website Customization
Restaurants will be able to configure predefined website templates.
Initial customization may include:
•	Logo
•	Primary colors
•	Secondary colors
•	Fonts
•	Layout
•	Menu presentation
•	Restaurant information
•	Basic homepage sections
The platform will use configuration-driven rendering rather than creating a separate application for each restaurant.
________________________________________
9.6 Public Restaurant Website
Each restaurant will receive a public web presence.
Conceptually:
pizza.saas.com
burger.saas.com
cafe.saas.com
The public website will dynamically load the appropriate tenant configuration and content.
The website will display:
•	Restaurant branding
•	Restaurant information
•	Menu categories
•	Menu items
•	Prices
•	Availability
•	Opening information
•	Ordering functionality
________________________________________
9.7 Online Ordering
Customers will be able to:
Browse Menu
     ↓
Select Item
     ↓
Add to Cart
     ↓
Modify Quantity
     ↓
Checkout
     ↓
Place Order
The initial version will focus on restaurant ordering rather than building a complete delivery-management platform.
________________________________________
9.8 Order Management
Restaurant staff will be able to manage orders through defined states.
Initial order lifecycle:
New
 ↓
Confirmed
 ↓
Preparing
 ↓
Ready
 ↓
Completed
An order may also be:
Cancelled
Detailed order-state transition rules will be defined later.
________________________________________
9.9 Real-Time Order Notifications
The platform will use ASP.NET Core SignalR for real-time order notifications.
Conceptual flow:
Customer
   ↓
Place Order
   ↓
ASP.NET Core API
   ↓
Save Order
   ↓
SignalR
   ↓
Kitchen Dashboard
   ↓
New Order Notification
The SignalR architecture must also respect tenant boundaries.
________________________________________
9.10 QR Menu
Each restaurant will receive a unique QR code.
Conceptually:
QR Code
   ↓
Restaurant Public URL
   ↓
Restaurant Website
   ↓
Digital Menu
The QR code allows customers to access the restaurant's digital menu without manually entering the website address.
________________________________________
10. V1 Scope
10.1 Included in V1
Tenant
•	Restaurant registration
•	Tenant creation
•	Tenant isolation
•	Tenant activation/deactivation
Authentication
•	Registration
•	Login
•	Authentication
•	Authorization
•	Roles
Restaurant
•	Restaurant profile
•	Restaurant settings
Menu
•	Categories
•	Menu items
•	Prices
•	Descriptions
•	Images
•	Availability
•	Ordering
Website
•	Predefined templates
•	Theme configuration
•	Logo
•	Colors
•	Fonts
•	Basic layout configuration
•	Live preview
Public Website
•	Restaurant branding
•	Restaurant information
•	Menu
•	Categories
•	Menu items
•	Cart
•	Checkout
Orders
•	Order creation
•	Order management
•	Order status
•	Kitchen dashboard
•	Real-time notifications
QR
•	Restaurant-specific QR code
•	Public menu URL
________________________________________
11. Explicitly Out of Scope for V1
The following capabilities will not be implemented initially.
11.1 Delivery Management
Not included:
•	Delivery rider management
•	Rider assignment
•	GPS tracking
•	Route optimization
•	Delivery fleet management
________________________________________
11.2 Advanced Payment Processing
The initial version will not require a complete payment gateway infrastructure.
The initial ordering model may support:
•	Cash
•	Pay at restaurant
Online payment providers can be added later.
________________________________________
11.3 Accounting
The platform will not initially provide:
•	Full accounting
•	Expense management
•	Payroll
•	Financial accounting
•	Tax accounting
________________________________________
11.4 AI
AI is not required for the core V1 product.
AI-based functionality may be considered as a future enhancement.
________________________________________
11.5 Native Mobile Applications
V1 will not include dedicated:
•	Android application
•	iOS application
The web application will be responsive.
________________________________________
11.6 Advanced Analytics
V1 may provide basic operational statistics but will not initially provide a comprehensive business intelligence system.
________________________________________
11.7 Multi-Branch Restaurants
V1 will use the simplified model:
One Tenant
    =
One Restaurant
Multi-branch support can be introduced in a future architectural iteration.
________________________________________
12. V1 Success Criteria
The first production-capable version will be considered successful when the following scenarios work correctly.
12.1 Restaurant Onboarding
A restaurant owner can:
Register
 ↓
Create Restaurant
 ↓
Configure Restaurant
 ↓
Add Menu
 ↓
Customize Website
 ↓
Publish
________________________________________
12.2 Tenant Isolation
Restaurant A must not be able to access Restaurant B's:
•	Users
•	Menu
•	Settings
•	Orders
•	Configuration
through either the UI or direct API requests.
________________________________________
12.3 Customer Ordering
A customer can:
Open Restaurant Website
 ↓
Browse Menu
 ↓
Add Items
 ↓
Checkout
 ↓
Place Order
________________________________________
12.4 Restaurant Order Processing
Restaurant staff can:
Receive Order
 ↓
Confirm
 ↓
Prepare
 ↓
Mark Ready
 ↓
Complete
________________________________________
12.5 Real-Time Notification
When an order is placed, the restaurant's authorized dashboard receives the new-order notification without requiring a browser refresh.
________________________________________
13. High-Level End-to-End Product Flow
The complete V1 business flow is:
                    PLATFORM
                       │
                       ▼
                Restaurant Owner
                       │
                    Register
                       │
                       ▼
                Tenant Created
                       │
                       ▼
             Restaurant Configuration
                       │
                       ▼
                   Add Menu
                       │
                       ▼
             Customize Website
                       │
                       ▼
                    Publish
                       │
                       ▼
             Public Restaurant URL
                       │
                       ▼
                    CUSTOMER
                       │
                       ▼
                  Browse Menu
                       │
                       ▼
                     Cart
                       │
                       ▼
                   Checkout
                       │
                       ▼
                  Place Order
                       │
                       ▼
                 ASP.NET Core
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        SQL Server             SignalR
                                 │
                                 ▼
                         Kitchen Dashboard
                                 │
                                 ▼
                           Process Order
________________________________________
14. Product Boundaries
The system consists of three major areas.
14.1 Platform Management
Used by the SaaS provider.
Platform Admin
     │
     ├── Tenants
     ├── Users
     ├── Plans
     ├── Subscriptions
     ├── Templates
     └── Platform Settings
14.2 Restaurant Management
Used by restaurant owners and staff.
Restaurant Dashboard
     │
     ├── Restaurant
     ├── Menu
     ├── Website
     ├── Orders
     ├── Staff
     ├── QR
     └── Subscription
14.3 Customer Experience
Used by restaurant customers.
Public Website
     │
     ├── Restaurant Information
     ├── Menu
     ├── Cart
     ├── Checkout
     └── Order
________________________________________
15. Initial Technical Direction
The planned technology stack is:
Frontend
•	Angular
•	TypeScript
•	RxJS
•	HTML
•	SCSS
Backend
•	C#
•	ASP.NET Core
•	.NET
•	Entity Framework Core
•	ASP.NET Core Identity
•	SignalR
•	FluentValidation
•	Hangfire
•	Serilog
Database
•	Microsoft SQL Server
•	Entity Framework Core
Architecture
•	Clean Architecture
•	SOLID principles
•	Dependency Injection
•	Domain-driven separation where appropriate
•	Multi-tenant architecture
The exact implementation architecture will be defined in the System Architecture phase.
________________________________________
16. Fundamental Architectural Principle
The most important architectural principle of the product is:
Tenant isolation is a mandatory security boundary throughout the entire system.
Tenant isolation must therefore be considered in:
•	Database access
•	Entity Framework Core
•	Authentication
•	Authorization
•	API endpoints
•	Application services
•	SignalR
•	Background jobs
•	File storage
•	Caching
•	Logging
•	Public website resolution
Tenant isolation must not depend solely on frontend restrictions.
________________________________________
17. Future Product Direction
The platform may eventually support:
•	Multiple restaurant branches
•	Custom domains
•	Online payment gateways
•	Delivery management
•	Advanced analytics
•	Customer accounts
•	Loyalty programs
•	Promotions and coupons
•	Reservations
•	Table management
•	Advanced restaurant reports
•	Mobile applications
•	Additional website templates
•	Enterprise plans
•	White-label functionality
These features are intentionally excluded from V1 so that the initial product remains focused and achievable.
________________________________________
18. Document Status
This document establishes the initial Product Vision and Scope.
The next documents will refine this specification rather than redefine the entire product.
Completed in Step 1
•	Product Vision
•	Problem Statement
•	Product Objectives
•	Target Market
•	Product Users
•	SaaS Model
•	Multi-Tenancy Direction
•	Core Capabilities
•	V1 Scope
•	Out-of-Scope Features
•	Success Criteria
•	Product Boundaries
•	High-Level Product Flow
•	Initial Technical Direction
•	Architectural Principle
•	Future Direction
Restaurant SaaS Platform
Document 02 — Stakeholders, Actors & Roles
________________________________________
1. Purpose
This document defines the people, organizations, and external systems that interact with the Restaurant SaaS Platform.
It establishes:
•	Stakeholders
•	System actors
•	Actor responsibilities
•	Actor goals
•	Access boundaries
•	Initial roles
•	Role hierarchy
•	Relationships between actors
•	External actors and services
This document will be used as the foundation for:
•	Functional requirements
•	Use cases
•	Authorization design
•	Permission design
•	User management
•	Tenant architecture
•	API authorization
•	UI access control
________________________________________
2. Stakeholder Definition
A stakeholder is a person, organization, or external entity that has an interest in, depends on, or is affected by the system.
The major stakeholders are:
                         Restaurant SaaS
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
 Platform Owner        Restaurant Business       Customers
       │                      │                      │
       ▼                      ▼                      ▼
 Platform Admin        Restaurant Users       End Customers
________________________________________
3. Stakeholder Categories
3.1 SaaS Platform Owner
The organization that owns and operates the Restaurant SaaS Platform.
Interests
•	Generate revenue through subscriptions
•	Acquire restaurants
•	Retain customers
•	Maintain platform availability
•	Protect tenant data
•	Control platform costs
•	Scale the platform
•	Provide reliable service
Responsibilities
•	Product ownership
•	Business decisions
•	Pricing
•	Subscription plans
•	Platform policies
•	Service availability
•	Security
•	Infrastructure
•	Customer support
________________________________________
4. Platform Administrator
The Platform Administrator operates the SaaS platform on behalf of the SaaS provider.
The administrator is a platform-level actor, not a restaurant-level user.
4.1 Goals
The Platform Administrator needs to:
•	Manage restaurants
•	Manage platform users
•	Manage subscription plans
•	Monitor platform activity
•	Manage templates
•	Manage platform configuration
•	Handle tenant-related administrative issues
4.2 Responsibilities
The Platform Administrator can manage:
Platform
├── Tenants
├── Users
├── Plans
├── Subscriptions
├── Templates
├── Platform Settings
└── Reports
4.3 Access Boundary
The Platform Administrator operates outside a specific restaurant tenant.
Conceptually:
Platform Admin
      │
      ├── Tenant A
      ├── Tenant B
      ├── Tenant C
      └── Tenant D
This is fundamentally different from:
Restaurant Owner
      │
      └── Tenant A only
Platform-level privileges must therefore be handled carefully to prevent accidental misuse.
________________________________________
5. Restaurant Owner
The Restaurant Owner is the primary customer of the SaaS platform.
A Restaurant Owner operates within a specific tenant.
5.1 Goals
The Restaurant Owner wants to:
•	Establish the restaurant's online presence
•	Configure the restaurant
•	Manage the menu
•	Customize the website
•	Publish the website
•	Receive customer orders
•	Manage staff
•	Monitor restaurant activity
5.2 Responsibilities
The owner can manage:
Restaurant Owner
│
├── Restaurant Profile
├── Restaurant Settings
├── Website
├── Menu
├── Orders
├── Staff
├── QR Code
└── Subscription
5.3 Tenant Boundary
A Restaurant Owner belongs to one tenant in V1.
For example:
Restaurant Owner A
       │
       ▼
Pizza Palace
Tenant A
The owner cannot manage:
Burger House
Tenant B
________________________________________
6. Restaurant Manager
The Restaurant Manager is an optional operational role for restaurants that need employees to manage daily activities.
The manager operates within the restaurant's tenant.
6.1 Goals
The manager may need to:
•	Manage menu operations
•	Manage orders
•	Monitor restaurant activity
•	Manage staff operations
•	Assist the owner
6.2 Responsibilities
Potential responsibilities include:
Manager
├── Menu Management
├── Order Management
├── Staff Management
└── Restaurant Operations
The exact permissions will be defined in the Authorization and Functional Requirements stages.
________________________________________
7. Kitchen Staff
Kitchen Staff are responsible for processing food orders.
Their primary concern is the order workflow.
7.1 Goals
Kitchen staff need to:
•	Receive new orders
•	View order details
•	Start preparing orders
•	Mark orders as ready
7.2 Responsibilities
Kitchen Staff
      │
      ├── View Orders
      ├── Accept/Confirm Orders
      ├── Start Preparation
      └── Mark Ready
Kitchen staff should not normally have access to:
•	Subscription management
•	Platform administration
•	Website configuration
•	Restaurant ownership settings
________________________________________
8. Cashier
The Cashier is responsible for order and payment-related operational activities.
Potential responsibilities include:
•	View orders
•	Create orders where supported
•	Confirm orders
•	Manage order status
•	Handle payment status
The exact payment functionality depends on the payment model implemented in V1.
________________________________________
9. Waiter
The Waiter is an optional restaurant role.
Potential responsibilities include:
•	View menu
•	Create customer orders where supported
•	View order status
•	Assist customers
The Waiter should have significantly more limited access than the Restaurant Owner or Manager.
________________________________________
10. Customer
The Customer is the end user who interacts with the restaurant's public website.
Unlike restaurant users, customers do not belong to the restaurant's administrative organization.
10.1 Goals
The customer wants to:
•	Find restaurant information
•	Browse the menu
•	Select food
•	Place an order
•	Receive order feedback/status
10.2 Customer Flow
Customer
   │
   ▼
Restaurant Website
   │
   ▼
Browse Menu
   │
   ▼
Select Items
   │
   ▼
Cart
   │
   ▼
Checkout
   │
   ▼
Place Order
10.3 Authentication
V1 should not require customers to create an account merely to browse a menu.
The initial ordering flow may support guest customers.
Customer accounts can be introduced later.
________________________________________
11. System-Level External Actors
The platform will eventually interact with external services.
These are not human users but are still actors from a system perspective.
________________________________________
12. Email Service
The Email Service is responsible for sending emails generated by the platform.
Potential messages include:
•	Registration verification
•	Password reset
•	Restaurant invitation
•	Order notifications
•	Subscription notifications
Conceptually:
ASP.NET Core
     │
     ▼
Email Service
     │
     ▼
Restaurant/User
The actual provider will be selected during the infrastructure/deployment phase.
________________________________________
13. File/Object Storage
The platform will require storage for assets such as:
•	Restaurant logos
•	Menu item images
•	Website images
Conceptually:
Angular
   ↓
API
   ↓
Object Storage
   ↓
Image URL
   ↓
Public Website
The exact storage provider will be decided later.
________________________________________
14. QR Code Generator
The platform will use a QR generation capability to generate restaurant-specific QR codes.
Conceptually:
Restaurant
     ↓
Public URL
     ↓
QR Generator
     ↓
QR Code
The QR code itself does not need to contain restaurant business data. It primarily needs to point to the appropriate public restaurant URL.
________________________________________
15. Payment Provider
A payment provider is a future external actor.
It will become relevant when online subscription payments and/or customer online payments are implemented.
Potential flow:
Customer
   ↓
Checkout
   ↓
SaaS API
   ↓
Payment Provider
   ↓
Payment Result
   ↓
SaaS API
Payment processing is not part of the initial V1 requirement.
________________________________________
16. Notification / Real-Time Service
ASP.NET Core SignalR will provide real-time communication.
Conceptually:
Customer
   ↓
Order API
   ↓
Order Created
   ↓
SignalR
   ↓
Restaurant Kitchen
SignalR is an internal platform technology rather than a separate business stakeholder, but it is an important system actor/component in the order workflow.
________________________________________
17. Actor Classification
The actors can therefore be categorized as follows.
Actor	Type	Scope
Platform Owner	Stakeholder	Entire Platform
Platform Administrator	Human Actor	Platform
Restaurant Owner	Human Actor	Tenant
Restaurant Manager	Human Actor	Tenant
Kitchen Staff	Human Actor	Tenant
Cashier	Human Actor	Tenant
Waiter	Human Actor	Tenant
Customer	Human Actor	Public Restaurant
Email Service	External System	Platform
Object Storage	External System	Platform
Payment Provider	External System	Future
QR Generator	External System/Component	Platform
________________________________________
18. Role Hierarchy
The initial conceptual hierarchy is:
                    Platform Administrator
                            │
                            │ Platform Scope
                            ▼
                    ┌───────────────┐
                    │    Tenant     │
                    └───────┬───────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
               ▼            ▼            ▼
            Owner        Manager       Staff
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                           Kitchen    Cashier     Waiter
The Customer is outside the restaurant's administrative hierarchy:
Customer
    │
    ▼
Public Restaurant Website
________________________________________
19. Platform Scope vs Tenant Scope
This distinction is fundamental to our SaaS architecture.
Platform Scope
Platform Administrator
        │
        ├── Tenant A
        ├── Tenant B
        ├── Tenant C
        └── Tenant D
Tenant Scope
Tenant A
   │
   ├── Owner
   ├── Manager
   ├── Kitchen Staff
   ├── Cashier
   └── Waiter
Tenant users must only operate within their assigned tenant.
________________________________________
20. Initial Role Matrix
This is an initial conceptual matrix. Detailed permissions will be defined later.
Capability	Platform Admin	Owner	Manager	Kitchen	Cashier	Waiter
Manage Tenants	✓	—	—	—	—	—
Manage Plans	✓	—	—	—	—	—
Restaurant Profile	✓*	✓	✓*	—	—	—
Website Configuration	✓*	✓	✓*	—	—	—
Menu Management	✓*	✓	✓	—	—	—
View Orders	✓*	✓	✓	✓	✓	✓*
Process Orders	✓*	✓	✓	✓	✓	✓*
Manage Staff	✓*	✓	✓*	—	—	—
Subscription	✓	✓	—	—	—	—
Platform Settings	✓	—	—	—	—	—
* indicates an administrative/support capability that will require more detailed definition.
This matrix is not yet the final authorization model.
________________________________________
21. Tenant Ownership Model
The V1 conceptual relationship is:
Tenant
   │
   └── Restaurant Owner
           │
           └── Restaurant
A tenant represents the isolated business/customer environment.
For V1:
One Tenant
    ↓
One Restaurant
A future version may support:
One Tenant
    ↓
Multiple Branches
without requiring a complete redesign.
________________________________________
22. Actor Interaction Overview
The major interactions are:
                    Platform Admin
                         │
                         ▼
                  Manage Platform
                         │
                         ▼
                      Tenants
                         │
                         ▼
                  Restaurant Owner
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Website          Menu          Orders
          │              │              │
          │              │              ▼
          │              │          Restaurant Staff
          │              │
          ▼              ▼
                 Customer
                    │
                    ▼
                 Ordering
                    │
                    ▼
              Order Processing
________________________________________
23. Security Boundary
Every administrative actor must operate within an explicit security boundary.
For example:
Tenant A Owner
     │
     ├── Tenant A Menu       ✓
     ├── Tenant A Orders     ✓
     ├── Tenant A Users      ✓
     │
     └── Tenant B Menu       ✗
A frontend restriction is not sufficient.
The backend must enforce this boundary.
________________________________________
24. Important Architectural Decision
Roles and tenants are different concepts.
A role answers:
What can this user do?
A tenant answers:
Which organization's data can this user operate on?
Therefore:
User
 ├── Identity
 ├── Role
 └── Tenant Membership
should not be conceptually collapsed into a single concept.
For example:
User: Ali
Role: Manager
Tenant: Pizza Palace
means:
Ali is a Manager of Pizza Palace.
It does not mean Ali is a Manager of every restaurant on the platform.
________________________________________
25. Future Authorization Direction
The initial system may start with roles:
PlatformAdmin
Owner
Manager
KitchenStaff
Cashier
Waiter
However, the architecture should allow permissions to be introduced later.
For example:
Menu.View
Menu.Create
Menu.Update
Menu.Delete

Order.View
Order.Create
Order.Update
Order.Cancel

Staff.View
Staff.Invite
Staff.Update
Staff.Remove
This provides greater flexibility than embedding every authorization rule directly into role checks.
________________________________________
26. Summary
The Restaurant SaaS Platform contains three primary interaction domains:
1. Platform
   └── Platform Administrator

2. Restaurant/Tenant
   ├── Owner
   ├── Manager
   ├── Kitchen Staff
   ├── Cashier
   └── Waiter

3. Public Customer
   └── Customer
External systems support the platform:
Email
Storage
QR Generation
Payment Provider (future)
The most important architectural distinction is:
                 Platform
                    │
                    ▼
              Tenant Boundary
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Tenant A             Tenant B
          │                   │
      Users/Roles         Users/Roles
          │                   │
       Data A              Data B
Every tenant-scoped actor must be restricted to the appropriate tenant.
________________________________________
27. Next Document
Restaurant SaaS Platform
Document 03 — Functional Requirements Specification (FRS)
Document Status: Draft
Version: 1.0
Related Documents:
•	Document 01 — Product Vision & Scope
•	Document 02 — Stakeholders, Actors & Roles
________________________________________
1. Purpose
This document defines the functional requirements of the Restaurant SaaS Platform.
Functional requirements describe what the system must do from the perspective of users, business operations, and system behavior.
These requirements will serve as the foundation for:
•	Use cases
•	User stories
•	API design
•	Database design
•	Angular feature design
•	Authorization
•	Validation
•	Testing
•	Development planning
Each requirement is assigned a unique identifier so that it can be traced throughout the development lifecycle.
________________________________________
2. Requirement Priority
The following priority levels are used:
Priority	Meaning
Must	Required for V1
Should	Important but not blocking for initial release
Could	Useful enhancement
Future	Outside V1
V1 development should prioritize Must requirements first.
________________________________________
3. Functional Requirement Categories
The system requirements are organized into the following functional areas:
FR
│
├── Authentication & Identity
├── Tenant Management
├── Restaurant Management
├── User & Staff Management
├── Menu Management
├── Website Management
├── Public Website
├── Cart & Checkout
├── Order Management
├── Real-Time Notifications
├── QR Code Management
├── Subscription Management
├── Platform Administration
├── File Management
├── Notifications
└── Audit & Activity
________________________________________
4. Authentication & Identity Requirements
FR-AUTH-001 — User Registration
Priority: Must
Actor: Restaurant Owner / User
The system shall allow a new user to register an account.
The registration process shall collect the information required to establish the user's identity and initial account.
Expected Result
A valid user account is created and can proceed through the required verification/onboarding process.
________________________________________
FR-AUTH-002 — User Login
Priority: Must
Actor: All authenticated users
The system shall allow registered users to authenticate using their credentials.
Expected Result
After successful authentication, the system shall establish an authenticated session/token containing the information required for authorization.
________________________________________
FR-AUTH-003 — Authentication Failure
Priority: Must
The system shall reject authentication attempts when credentials are invalid.
The system shall not reveal sensitive information such as whether a specific password is correct.
________________________________________
FR-AUTH-004 — Password Management
Priority: Must
The system shall provide mechanisms for:
•	Password change
•	Password reset
•	Password recovery
The system shall securely process passwords.
________________________________________
FR-AUTH-005 — User Logout
Priority: Must
Authenticated users shall be able to terminate their authenticated session.
________________________________________
FR-AUTH-006 — Role Identification
Priority: Must
The system shall associate authenticated users with one or more authorized roles according to the authorization model.
Examples:
PlatformAdmin
Owner
Manager
KitchenStaff
Cashier
Waiter
________________________________________
FR-AUTH-007 — Authorization
Priority: Must
The system shall prevent users from accessing functionality for which they do not have permission.
Authorization must be enforced by the backend.
Frontend UI restrictions shall not be considered sufficient security.
________________________________________
FR-AUTH-008 — Tenant-Aware Identity
Priority: Must
For tenant users, the authenticated identity shall be associated with the appropriate tenant context.
Example:
User
 ├── UserId
 ├── Role
 └── TenantId
The system shall use this relationship when determining access to tenant resources.
________________________________________
5. Tenant Management Requirements
FR-TENANT-001 — Create Tenant
Priority: Must
Actor: Platform Administrator / Approved onboarding workflow
The system shall create a tenant representing a restaurant business.
A tenant shall receive a unique identifier.
________________________________________
FR-TENANT-002 — Unique Tenant Identifier
Priority: Must
Each tenant shall have a unique internal identifier.
The identifier shall be used to associate tenant-owned resources with the correct tenant.
________________________________________
FR-TENANT-003 — Tenant Name
Priority: Must
Each tenant shall have a business/restaurant name.
________________________________________
FR-TENANT-004 — Tenant Slug
Priority: Must
The system shall maintain a unique URL-safe identifier for a restaurant.
Example:
Pizza Palace
      ↓
pizza-palace
The slug shall be unique according to the public URL strategy.
________________________________________
FR-TENANT-005 — Tenant Activation
Priority: Must
The platform shall allow a tenant to be activated or deactivated.
An inactive tenant shall not be permitted to perform operations that require an active subscription/tenant according to the platform's business rules.
________________________________________
FR-TENANT-006 — Tenant Isolation
Priority: Must
Security Critical
The system shall prevent one tenant from accessing another tenant's protected resources.
Example:
Tenant A
   ↓
GET /api/menu
   ↓
Only Tenant A menu
Tenant A must not be able to retrieve Tenant B's menu by manipulating identifiers or requests.
________________________________________
FR-TENANT-007 — Tenant Context Resolution
Priority: Must
For tenant-scoped requests, the system shall determine the current tenant from the appropriate trusted request context.
Potential mechanisms include:
•	Authenticated tenant membership
•	Host/subdomain
•	Public restaurant slug
•	Internal tenant resolution
The final mechanism will be defined during architecture design.
________________________________________
FR-TENANT-008 — Tenant-Scoped Data
Priority: Must
Tenant-owned resources shall be associated with the appropriate tenant.
Examples:
Menu
MenuCategory
MenuItem
Order
RestaurantSettings
WebsiteConfiguration
________________________________________
6. Restaurant Management Requirements
FR-REST-001 — Restaurant Profile
Priority: Must
Actor: Restaurant Owner
The owner shall be able to create and maintain the restaurant profile.
________________________________________
FR-REST-002 — Restaurant Information
The restaurant profile shall support appropriate information such as:
•	Name
•	Description
•	Phone
•	Email
•	Address
•	Logo
•	Website information
________________________________________
FR-REST-003 — Restaurant Logo
Priority: Must
The owner shall be able to upload or update the restaurant logo.
The system shall validate the uploaded file according to supported file types and size limits.
________________________________________
FR-REST-004 — Restaurant Contact Information
Priority: Must
The restaurant shall be able to configure:
•	Phone number
•	Email address
•	Physical address
•	Social links where supported
________________________________________
FR-REST-005 — Opening Hours
Priority: Must
The restaurant shall be able to configure its opening hours.
The system shall support different hours for different days.
Example:
Monday     11:00 - 23:00
Tuesday    11:00 - 23:00
Wednesday  11:00 - 23:00
________________________________________
FR-REST-006 — Restaurant Status
Priority: Must
The system shall maintain whether the restaurant is active and available to customers.
________________________________________
7. User & Staff Management Requirements
FR-STAFF-001 — View Staff
Priority: Must
Actor: Owner / Authorized Manager
Authorized users shall be able to view restaurant staff belonging to their tenant.
________________________________________
FR-STAFF-002 — Invite Staff
Priority: Must
An authorized restaurant user shall be able to invite a staff member to join the restaurant.
________________________________________
FR-STAFF-003 — Assign Staff Role
Priority: Must
An authorized user shall be able to assign an appropriate role to a staff member.
Examples:
Manager
KitchenStaff
Cashier
Waiter
________________________________________
FR-STAFF-004 — Update Staff
Priority: Must
Authorized users shall be able to update appropriate staff information and role assignments.
________________________________________
FR-STAFF-005 — Deactivate Staff
Priority: Must
An authorized user shall be able to deactivate a staff member.
A deactivated staff member shall not be able to perform normal authenticated restaurant operations.
________________________________________
FR-STAFF-006 — Tenant Staff Isolation
Priority: Must
Security Critical
Restaurant users shall only be able to view and manage staff belonging to their own tenant.
________________________________________
8. Menu Category Requirements
FR-MENU-001 — Create Category
Priority: Must
Authorized restaurant users shall be able to create a menu category.
Example:
Starters
Pizza
Burgers
Drinks
Desserts
________________________________________
FR-MENU-002 — Update Category
Priority: Must
Authorized users shall be able to modify category information.
________________________________________
FR-MENU-003 — Delete Category
Priority: Must
Authorized users shall be able to remove a category according to menu business rules.
The system must prevent invalid deletion when associated menu items would violate business rules.
________________________________________
FR-MENU-004 — Category Ordering
Priority: Must
Authorized users shall be able to define the display order of categories.
________________________________________
FR-MENU-005 — Category Availability
Priority: Should
Authorized users should be able to activate or deactivate a category without necessarily deleting it.
________________________________________
FR-MENU-006 — Tenant Category Isolation
Priority: Must
Security Critical
A category belonging to one tenant must not be accessible or assignable to menu items belonging to another tenant.
________________________________________
9. Menu Item Requirements
FR-MENU-007 — Create Menu Item
Priority: Must
Authorized restaurant users shall be able to create menu items.
A menu item shall support information such as:
•	Name
•	Description
•	Price
•	Category
•	Image
•	Availability
•	Display order
________________________________________
FR-MENU-008 — Update Menu Item
Priority: Must
Authorized users shall be able to update menu item information.
________________________________________
FR-MENU-009 — Delete Menu Item
Priority: Must
Authorized users shall be able to remove a menu item according to business rules.
________________________________________
FR-MENU-010 — Menu Item Price
Priority: Must
Each sellable menu item shall have a valid price.
The system shall reject invalid prices such as negative values.
________________________________________
FR-MENU-011 — Menu Item Availability
Priority: Must
Authorized users shall be able to mark a menu item as available or unavailable.
An unavailable item shall not be orderable by customers.
________________________________________
FR-MENU-012 — Menu Item Image
Priority: Should
Authorized users should be able to upload an image for a menu item.
________________________________________
FR-MENU-013 — Menu Item Ordering
Priority: Must
Authorized users shall be able to define the display order of menu items within their category.
________________________________________
FR-MENU-014 — Menu Tenant Isolation
Priority: Must
Security Critical
A menu item must belong to the appropriate tenant and must not be accessible through another tenant.
________________________________________
10. Website Management Requirements
FR-WEB-001 — Website Configuration
Priority: Must
Actor: Restaurant Owner / Authorized User
The system shall allow authorized users to configure the restaurant's public website.
________________________________________
FR-WEB-002 — Website Template
Priority: Must
The system shall support predefined website templates.
A restaurant shall be able to select an available template.
________________________________________
FR-WEB-003 — Theme Colors
Priority: Must
The restaurant shall be able to configure supported theme colors.
Examples:
Primary Color
Secondary Color
Background Color
Text Color
________________________________________
FR-WEB-004 — Font Configuration
Priority: Should
The restaurant should be able to select from supported fonts.
________________________________________
FR-WEB-005 — Website Layout
Priority: Must
The restaurant shall be able to configure supported layout options.
________________________________________
FR-WEB-006 — Website Preview
Priority: Must
The restaurant shall be able to preview website configuration before publishing.
________________________________________
FR-WEB-007 — Website Publishing
Priority: Must
Authorized users shall be able to publish the configured website.
________________________________________
FR-WEB-008 — Website Configuration Isolation
Priority: Must
A restaurant must only be able to modify its own website configuration.
________________________________________
11. Public Website Requirements
FR-PUBLIC-001 — Resolve Restaurant
Priority: Must
The public website system shall identify the restaurant associated with the requested public URL.
Example:
pizza.saas.com
       ↓
Pizza Palace
________________________________________
FR-PUBLIC-002 — Display Restaurant Information
Priority: Must
The public website shall display the restaurant's published information.
________________________________________
FR-PUBLIC-003 — Display Menu
Priority: Must
The public website shall display the restaurant's published menu.
________________________________________
FR-PUBLIC-004 — Display Categories
Priority: Must
The public website shall display menu categories according to the configured ordering.
________________________________________
FR-PUBLIC-005 — Display Menu Items
Priority: Must
The public website shall display:
•	Item name
•	Description
•	Price
•	Image where available
•	Availability
________________________________________
FR-PUBLIC-006 — Hide Unavailable Items
Priority: Must
Unavailable menu items shall not be available for customer ordering.
The exact display behavior may allow unavailable items to remain visible with an unavailable status.
________________________________________
FR-PUBLIC-007 — Apply Website Theme
Priority: Must
The public website shall apply the restaurant's published theme configuration.
________________________________________
FR-PUBLIC-008 — Public Tenant Isolation
Priority: Must
Security Critical
A public restaurant website must only display data belonging to the resolved restaurant.
________________________________________
12. Cart Requirements
FR-CART-001 — Add Item
Priority: Must
A customer shall be able to add an available menu item to the cart.
________________________________________
FR-CART-002 — Update Quantity
Priority: Must
A customer shall be able to increase or decrease the quantity of an item in the cart.
________________________________________
FR-CART-003 — Remove Item
Priority: Must
A customer shall be able to remove an item from the cart.
________________________________________
FR-CART-004 — Calculate Cart Total
Priority: Must
The system shall calculate the cart subtotal and applicable totals.
The authoritative price calculation must occur on the server when the order is created.
The client-side total must not be trusted.
________________________________________
FR-CART-005 — Tenant Cart Boundary
Priority: Must
A cart/order session must not combine products from different restaurant tenants.
________________________________________
13. Checkout Requirements
FR-CHECKOUT-001 — Customer Information
Priority: Must
The customer shall provide the information required to place an order.
The exact information will be finalized during detailed checkout design.
Potential information includes:
•	Customer name
•	Phone number
•	Order notes
________________________________________
FR-CHECKOUT-002 — Validate Cart
Priority: Must
Before creating an order, the system shall validate:
•	Menu item existence
•	Item availability
•	Current price
•	Quantity
•	Restaurant status
________________________________________
FR-CHECKOUT-003 — Create Order
Priority: Must
The system shall create an order from a valid checkout request.
________________________________________
FR-CHECKOUT-004 — Server-Side Pricing
Priority: Must
Security Critical
The backend shall calculate the authoritative order amount using trusted database values.
The client shall not be allowed to determine the final order price.
________________________________________
14. Order Management Requirements
FR-ORDER-001 — Create Order
Priority: Must
The system shall create an order after successful checkout validation.
________________________________________
FR-ORDER-002 — Order Number
Priority: Must
Each order shall have a unique order identifier/number suitable for customer and restaurant reference.
________________________________________
FR-ORDER-003 — Order Items
Priority: Must
An order shall contain one or more order items.
Each order item shall preserve the relevant product information and price used when the order was placed.
________________________________________
FR-ORDER-004 — Order Status
Priority: Must
Orders shall support the defined lifecycle:
New
 ↓
Confirmed
 ↓
Preparing
 ↓
Ready
 ↓
Completed
Orders may also transition to:
Cancelled
________________________________________
FR-ORDER-005 — View Orders
Priority: Must
Authorized restaurant users shall be able to view orders belonging to their tenant.
________________________________________
FR-ORDER-006 — Update Order Status
Priority: Must
Authorized restaurant users shall be able to update an order according to permitted status transitions.
________________________________________
FR-ORDER-007 — Tenant Order Isolation
Priority: Must
Security Critical
Restaurant users shall only be able to view and manipulate orders belonging to their tenant.
________________________________________
FR-ORDER-008 — Order History
Priority: Must
The system shall maintain completed and historical orders according to the retention policy.
________________________________________
FR-ORDER-009 — Cancel Order
Priority: Must
Authorized users shall be able to cancel an order when the order's current status permits cancellation.
________________________________________
15. Real-Time Order Requirements
FR-REALTIME-001 — New Order Notification
Priority: Must
When a customer successfully places an order, the system shall notify the appropriate restaurant dashboard in real time.
________________________________________
FR-REALTIME-002 — SignalR Connection
Priority: Must
Authorized restaurant users shall be able to establish a SignalR connection for real-time order updates.
________________________________________
FR-REALTIME-003 — Tenant SignalR Isolation
Priority: Must
Security Critical
A restaurant user shall only receive real-time events belonging to their authorized tenant.
Example:
Tenant A Order
     ↓
Tenant A SignalR Group
     ↓
Tenant A Dashboard
Tenant B must not receive the event.
________________________________________
FR-REALTIME-004 — Reconnection
Priority: Should
The frontend should attempt to reconnect when a temporary SignalR connection failure occurs.
________________________________________
16. QR Code Requirements
FR-QR-001 — Generate QR Code
Priority: Must
The system shall generate a QR code for a restaurant's public URL.
________________________________________
FR-QR-002 — Restaurant-Specific QR
Priority: Must
Each QR code shall resolve to the appropriate restaurant.
________________________________________
FR-QR-003 — Regenerate QR
Priority: Should
Authorized users should be able to regenerate a QR code when required.
________________________________________
FR-QR-004 — QR Download
Priority: Should
Restaurant users should be able to download or otherwise retrieve the generated QR representation.
________________________________________
17. Platform Administration Requirements
FR-ADMIN-001 — View Tenants
Priority: Must
Actor: Platform Administrator
The platform administrator shall be able to view registered tenants.
________________________________________
FR-ADMIN-002 — Create Tenant
Priority: Must
The platform administrator shall be able to create a tenant through the administrative interface where supported by the onboarding process.
________________________________________
FR-ADMIN-003 — Activate Tenant
Priority: Must
The platform administrator shall be able to activate a tenant.
________________________________________
FR-ADMIN-004 — Deactivate Tenant
Priority: Must
The platform administrator shall be able to deactivate a tenant.
________________________________________
FR-ADMIN-005 — View Tenant Details
Priority: Must
The platform administrator shall be able to view relevant tenant information.
________________________________________
FR-ADMIN-006 — Platform User Management
Priority: Must
The platform administrator shall be able to manage platform-level users.
________________________________________
18. Subscription Requirements
Subscription functionality is part of the SaaS business model but detailed payment integration is outside the initial V1 implementation.
FR-SUB-001 — Subscription Plans
Priority: Must
The platform shall support configurable subscription plans.
A plan may define:
•	Name
•	Price
•	Billing period
•	Feature availability
•	Usage limits
________________________________________
FR-SUB-002 — Assign Subscription
Priority: Must
A tenant shall have an associated subscription according to the platform's business rules.
________________________________________
FR-SUB-003 — Subscription Status
Priority: Must
The system shall track subscription status.
Potential states include:
Trial
Active
PastDue
Suspended
Cancelled
Expired
The final lifecycle will be defined later.
________________________________________
FR-SUB-004 — Feature Limits
Priority: Should
The system should enforce subscription-based limits.
Example:
Plan: Basic
Maximum Menu Items: 50
________________________________________
FR-SUB-005 — Subscription Access
Priority: Must
The platform shall determine whether tenant functionality is available according to subscription status and applicable business rules.
________________________________________
19. File Management Requirements
FR-FILE-001 — Upload Restaurant Logo
Priority: Must
Authorized users shall be able to upload restaurant logos.
________________________________________
FR-FILE-002 — Upload Menu Image
Priority: Should
Authorized users should be able to upload menu item images.
________________________________________
FR-FILE-003 — File Validation
Priority: Must
The system shall validate uploaded files for:
•	Supported file type
•	Maximum file size
•	Appropriate content
________________________________________
FR-FILE-004 — Tenant File Isolation
Priority: Must
Security Critical
Tenant-owned files must not be accessible or modifiable by unauthorized tenants.
________________________________________
20. Notification Requirements
FR-NOTIFY-001 — User Notification
Priority: Should
The system should provide appropriate notifications for important events.
Examples:
•	Staff invitation
•	Password reset
•	Order event
•	Subscription event
________________________________________
FR-NOTIFY-002 — Email Notification
Priority: Should
The system should support email notifications through an external email provider.
________________________________________
FR-NOTIFY-003 — Notification Reliability
Priority: Should
Important asynchronous notifications should be processed reliably.
Background processing may be used for email and other asynchronous operations.
________________________________________
21. Audit & Activity Requirements
FR-AUDIT-001 — Record Sensitive Operations
Priority: Should
The system should record important administrative operations.
Examples:
User created
Staff role changed
Restaurant deactivated
Order cancelled
Subscription changed
________________________________________
FR-AUDIT-002 — Tenant Audit Isolation
Priority: Must
Tenant-specific audit information must respect tenant boundaries.
Platform-level operations may require platform-level audit records.
________________________________________
22. Search & Filtering Requirements
FR-SEARCH-001 — Restaurant Menu Filtering
Priority: Should
Restaurant users should be able to filter menu items according to supported criteria.
________________________________________
FR-SEARCH-002 — Order Filtering
Priority: Must
Restaurant users shall be able to filter orders by relevant properties such as:
•	Status
•	Date
•	Order number
________________________________________
FR-SEARCH-003 — Order Search
Priority: Should
Authorized users should be able to search for an order using its reference number or other supported identifiers.
________________________________________
23. Error Handling Requirements
FR-ERROR-001 — Validation Errors
Priority: Must
The API shall return meaningful validation errors when requests contain invalid data.
________________________________________
FR-ERROR-002 — Unauthorized Access
Priority: Must
The system shall reject requests from unauthenticated users when authentication is required.
________________________________________
FR-ERROR-003 — Forbidden Access
Priority: Must
The system shall reject authenticated users who do not have permission to access a resource.
________________________________________
FR-ERROR-004 — Tenant Resource Protection
Priority: Must
Security Critical
Requests attempting to access resources belonging to another tenant shall be rejected according to the platform's security policy.
________________________________________
24. Public Website Availability Requirements
FR-PUBLIC-009 — Inactive Restaurant
Priority: Must
If a restaurant is inactive or otherwise unavailable according to business rules, the public website shall not permit normal ordering.
The exact public behavior may be:
Restaurant unavailable
rather than exposing administrative information.
________________________________________
FR-PUBLIC-010 — Published Configuration
Priority: Must
The public website shall use the restaurant's published website configuration rather than exposing unpublished administrative changes.
________________________________________
25. Requirement Traceability
The requirements will eventually map to other development artifacts.
Example:
FR-MENU-007
Create Menu Item
      │
      ├── Use Case: UC-MENU-001
      │
      ├── API: POST /api/menu-items
      │
      ├── Database: MenuItems
      │
      ├── Angular: MenuItemForm
      │
      └── Tests: MenuItemCreationTests
This traceability allows us to verify that every important requirement is actually implemented and tested.
________________________________________
26. Functional Requirement Summary
The major V1 functional areas are:
Area	Requirement Range	Priority
Authentication	FR-AUTH	Must
Tenant Management	FR-TENANT	Must
Restaurant Management	FR-REST	Must
Staff Management	FR-STAFF	Must
Menu Categories	FR-MENU-001–006	Must
Menu Items	FR-MENU-007–014	Must
Website	FR-WEB	Must
Public Website	FR-PUBLIC	Must
Cart	FR-CART	Must
Checkout	FR-CHECKOUT	Must
Orders	FR-ORDER	Must
Real-Time	FR-REALTIME	Must
QR	FR-QR	Must
Administration	FR-ADMIN	Must
Subscription	FR-SUB	Must/Should
Files	FR-FILE	Must
Notifications	FR-NOTIFY	Should
Audit	FR-AUDIT	Should
Search/Filtering	FR-SEARCH	Must/Should
Error Handling	FR-ERROR	Must
________________________________________
27. Critical V1 Functional Requirements
The following requirements are considered especially important because failure in these areas can compromise the entire product:
FR-TENANT-006
Tenant Isolation

FR-AUTH-007
Authorization

FR-AUTH-008
Tenant-Aware Identity

FR-MENU-006
Tenant Category Isolation

FR-MENU-014
Tenant Menu Isolation

FR-PUBLIC-008
Public Tenant Isolation

FR-CART-005
Tenant Cart Boundary

FR-CHECKOUT-004
Server-Side Pricing

FR-ORDER-007
Tenant Order Isolation

FR-REALTIME-003
Tenant SignalR Isolation

FR-FILE-004
Tenant File Isolation

FR-ERROR-004
Tenant Resource Protection
These requirements should receive dedicated security and integration tests.
________________________________________
28. V1 End-to-End Functional Flow
The requirements collectively produce the following business flow:
                    PLATFORM
                       │
                       ▼
                Register User
                       │
                       ▼
                 Create Tenant
                       │
                       ▼
             Configure Restaurant
                       │
                       ▼
                   Add Menu
                       │
                       ▼
              Configure Website
                       │
                       ▼
                    Publish
                       │
                       ▼
              Public Restaurant URL
                       │
                       ▼
                    Customer
                       │
                       ▼
                 Browse Menu
                       │
                       ▼
                     Cart
                       │
                       ▼
                   Checkout
                       │
                       ▼
                 Create Order
                       │
              ┌────────┴────────┐
              ▼                 ▼
         SQL Server           SignalR
                                  │
                                  ▼
                          Restaurant Dashboard
                                  │
                                  ▼
                           Process Order
________________________________________
29. Requirements Status
Completed
•	Authentication requirements
•	Tenant requirements
•	Restaurant requirements
•	Staff requirements
•	Menu requirements
•	Website requirements
•	Public website requirements
•	Cart requirements
•	Checkout requirements
•	Order requirements
•	Real-time requirements
•	QR requirements
•	Platform administration requirements
•	Subscription requirements
•	File requirements
•	Notification requirements
•	Audit requirements
•	Search requirements
•	Error handling requirements
•	Requirement traceability
Not Yet Defined in Detail
The following will be developed in later SDLC documents:
•	Detailed use cases
•	User stories
•	Business rules
•	Non-functional requirements
•	Domain model
•	ERD
•	API contracts
•	Architecture
•	Security architecture
•	UI/UX specification
•	Testing strategy
•	Deployment architecture
________________________________________
30. Next Document
04 — Non-Functional Requirements Specification (NFR)
1. Document Purpose
This document defines the non-functional requirements (NFRs) for the Restaurant SaaS Platform.
Functional requirements define what the system does. Non-functional requirements define how well, how securely, and under what operational conditions the system must perform.
These requirements establish quality standards for:
•	Performance
•	Scalability
•	Availability
•	Reliability
•	Security
•	Multi-tenant isolation
•	Maintainability
•	Usability
•	Accessibility
•	Compatibility
•	Observability
•	Logging
•	Data integrity
•	Backup and recovery
•	API behavior
•	Database performance
•	Concurrency
•	Rate limiting
•	Deployment
These requirements will later influence the system architecture, database design, API design, Angular architecture, infrastructure, testing strategy, and deployment strategy.
________________________________________
2. Requirement Priority
Each requirement uses the following priority:
Priority	Meaning
Must	Required for V1
Should	Important, but can have limited V1 implementation
Could	Valuable enhancement
Future	Planned for later versions
________________________________________
3. Performance Requirements
NFR-PERF-001 — API Response Performance
Priority: Must
The API should respond within the following target ranges under normal operating conditions:
Operation Type	Target
Simple read operation	≤ 500 ms
Normal CRUD operation	≤ 1 second
Complex query	≤ 2 seconds
Order creation	≤ 1 second
Authentication request	≤ 1 second
These are engineering targets rather than contractual SLAs.
________________________________________
NFR-PERF-002 — Public Website Performance
Priority: Must
Restaurant public websites must load quickly enough to provide a usable customer experience, particularly on mobile devices.
The system should:
•	Minimize unnecessary API requests.
•	Optimize images.
•	Avoid loading unused resources.
•	Cache appropriate public data.
•	Use pagination where required.
•	Avoid unnecessarily large API responses.
________________________________________
NFR-PERF-003 — Menu Loading
Priority: Must
A restaurant's public menu should load without requiring the complete administrative dataset.
The API should return only the information required to display:
•	Restaurant information
•	Published website configuration
•	Categories
•	Available menu items
•	Prices
•	Images
•	Availability status
________________________________________
NFR-PERF-004 — Database Query Performance
Priority: Must
Frequently accessed database queries must be optimized.
The system should:
•	Use appropriate indexes.
•	Avoid unnecessary Include() operations.
•	Avoid N+1 queries.
•	Use projections where appropriate.
•	Use AsNoTracking() for read-only queries where appropriate.
•	Apply pagination to large datasets.
•	Avoid loading unnecessary records into memory.
________________________________________
NFR-PERF-005 — Pagination
Priority: Must
Large collections must support pagination.
Examples include:
•	Orders
•	Menu items
•	Staff
•	Customers
•	Notifications
•	Audit logs
•	Platform tenants
The API must not return unlimited records by default.
________________________________________
NFR-PERF-006 — Image Performance
Priority: Should
Restaurant logos and menu item images should be optimized before or during storage/delivery.
The system should support:
•	Appropriate image dimensions
•	File size limits
•	Compression
•	Efficient delivery
•	Appropriate caching
________________________________________
4. Scalability Requirements
NFR-SCAL-001 — Multi-Tenant Scalability
Priority: Must
The system must support multiple restaurants operating simultaneously without one tenant negatively affecting another tenant's data or normal operations.
The architecture must allow additional tenants to be added without creating a separate application instance for every restaurant.
________________________________________
NFR-SCAL-002 — Horizontal Scalability
Priority: Should
The backend should be designed so that multiple application instances can run simultaneously when required.
The application should avoid relying on:
•	In-memory session state
•	In-memory tenant state
•	Instance-specific business state
•	Local-only application state
________________________________________
NFR-SCAL-003 — Database Scalability
Priority: Must
The database design must support growth in:
•	Tenants
•	Users
•	Menu items
•	Orders
•	Order items
•	Notifications
•	Audit records
Tenant-scoped queries must remain efficient as the total database size increases.
________________________________________
NFR-SCAL-004 — Background Processing Scalability
Priority: Should
Long-running or asynchronous operations should be capable of being moved to background processing.
Examples:
•	Email sending
•	Notification processing
•	Image processing
•	Report generation
•	Scheduled subscription operations
________________________________________
5. Availability Requirements
NFR-AVAIL-001 — Application Availability
Priority: Must
The platform should remain available during normal operating periods except for:
•	Planned maintenance
•	Infrastructure failure
•	External service failure
•	Emergency security maintenance
For V1, availability targets should be treated as engineering objectives rather than formal contractual SLAs.
________________________________________
NFR-AVAIL-002 — Graceful Failure
Priority: Must
Failure of a non-critical external service must not unnecessarily bring down the entire application.
For example:
If the email service is temporarily unavailable:
•	The order system should continue operating.
•	The email should be retried or queued.
•	The failure should be logged.
•	The user should receive an appropriate response.
________________________________________
NFR-AVAIL-003 — Service Dependency Handling
Priority: Should
External service failures should be handled using appropriate mechanisms such as:
•	Timeouts
•	Retries
•	Circuit breakers where appropriate
•	Background queues
•	Fallback behavior
________________________________________
6. Reliability Requirements
NFR-REL-001 — Reliable Order Creation
Priority: Must
When a customer successfully submits an order, the system must ensure that the order is persisted correctly.
An order must not be partially created because of an intermediate failure.
________________________________________
NFR-REL-002 — Transaction Integrity
Priority: Must
Operations involving multiple related database changes must use appropriate transaction boundaries.
For example:
Creating an order may involve:
1.	Creating the order.
2.	Creating order items.
3.	Calculating/storing totals.
4.	Updating required related information.
These operations must maintain consistent database state.
________________________________________
NFR-REL-003 — Notification Reliability
Priority: Must
Real-time notification failure must not cause loss of the underlying order.
For example:
Customer places order
        ↓
Order saved successfully
        ↓
SignalR notification
        ↓
Restaurant receives notification
If SignalR delivery fails, the order must still exist and be retrievable from the restaurant dashboard.
________________________________________
NFR-REL-004 — Retryable Operations
Priority: Should
Operations that can safely be retried should be designed to tolerate transient failures.
Examples:
•	Email sending
•	Background jobs
•	External API calls
________________________________________
7. Security Requirements
NFR-SEC-001 — Authentication Security
Priority: Must
Authenticated operations must require valid authentication credentials.
The system must securely handle:
•	Passwords
•	Authentication tokens
•	Refresh credentials if implemented
•	User sessions
•	Account status
Passwords must never be stored in plaintext.
________________________________________
NFR-SEC-002 — Authorization
Priority: Must
Authentication alone must not grant access to protected functionality.
The system must enforce authorization based on:
•	User identity
•	Role
•	Permission
•	Tenant membership
•	Resource ownership where applicable
________________________________________
NFR-SEC-003 — Tenant Isolation
Priority: Must — Critical
Tenant isolation is a security boundary.
A user belonging to Restaurant A must never be able to access Restaurant B's:
•	Employees
•	Staff
•	Menu
•	Orders
•	Customers
•	Website configuration
•	Files
•	Notifications
•	Audit records
•	Subscription information
Tenant isolation must be enforced server-side.
Client-side filtering is not considered a security mechanism.
________________________________________
NFR-SEC-004 — Tenant Context Validation
Priority: Must
Every tenant-scoped operation must execute within a validated tenant context.
The system must not blindly trust a client-provided TenantId.
Tenant context may be resolved through mechanisms such as:
•	Authenticated user's tenant membership
•	Host/subdomain
•	Route/slug for public requests
•	Validated administrative context
________________________________________
NFR-SEC-005 — Resource Authorization
Priority: Must
The system must validate that the requested resource belongs to the current tenant before allowing access.
Example:
GET /api/orders/123
The system must verify that Order 123 belongs to the requesting user's authorized tenant.
________________________________________
NFR-SEC-006 — Input Validation
Priority: Must
All externally supplied input must be validated.
Validation must exist for:
•	Request DTOs
•	Query parameters
•	Route parameters
•	File uploads
•	User-generated content
•	Numeric values
•	Prices
•	Quantities
________________________________________
NFR-SEC-007 — Server-Side Business Validation
Priority: Must
Critical business rules must never depend exclusively on Angular/frontend validation.
For example:
Frontend:
Price = 500
        ↓
API
        ↓
Server verifies actual menu price
        ↓
Order total calculated
The client must not be trusted to determine authoritative order pricing.
________________________________________
NFR-SEC-008 — Secure Password Storage
Priority: Must
Passwords must be stored using a secure password hashing mechanism provided by the authentication framework.
The system must never store:
Password = "123456"
or any reversible representation of a password.
________________________________________
NFR-SEC-009 — Sensitive Data Protection
Priority: Must
Sensitive information must not be unnecessarily exposed through:
•	API responses
•	Logs
•	Exceptions
•	URLs
•	Client-side storage
•	Debug output
________________________________________
NFR-SEC-010 — HTTPS
Priority: Must
Production communication must use HTTPS.
Authentication credentials and sensitive application data must not be transmitted over unencrypted HTTP.
________________________________________
NFR-SEC-011 — API Error Security
Priority: Must
Production API responses must not expose:
•	Database connection strings
•	SQL queries
•	Stack traces
•	Internal file paths
•	Secrets
•	Authentication credentials
•	Infrastructure details
________________________________________
NFR-SEC-012 — File Upload Security
Priority: Must
Uploaded files must be validated for:
•	File type
•	File size
•	Extension
•	Content where appropriate
•	Tenant ownership
Uploaded files must not allow one tenant to access another tenant's files.
________________________________________
NFR-SEC-013 — SignalR Tenant Security
Priority: Must
SignalR connections and groups must respect tenant boundaries.
For example:
Restaurant A
    ↓
TenantGroup-A

Restaurant B
    ↓
TenantGroup-B
An order event from Restaurant A must never be broadcast to Restaurant B.
________________________________________
NFR-SEC-014 — Background Job Tenant Security
Priority: Must
Background jobs processing tenant-specific data must preserve tenant context.
A background job must never accidentally execute against another tenant's data.
________________________________________
8. Maintainability Requirements
NFR-MAINT-001 — Layered Architecture
Priority: Must
The system should follow a clearly separated architecture.
The backend should separate concerns such as:
API
Application
Domain
Infrastructure
Business logic must not unnecessarily reside inside controllers.
________________________________________
NFR-MAINT-002 — Separation of Concerns
Priority: Must
Each component should have a clearly defined responsibility.
Examples:
•	Controllers → HTTP/API concerns
•	Application services → use-case orchestration
•	Domain → business rules
•	Infrastructure → database/external services
•	Angular services → API/state interaction
•	Components → UI behavior
________________________________________
NFR-MAINT-003 — SOLID Principles
Priority: Must
The implementation should follow SOLID principles where they provide practical value.
Particular attention should be given to:
•	Single Responsibility
•	Dependency Inversion
•	Interface Segregation
The system should avoid unnecessary abstraction merely for the sake of applying SOLID.
________________________________________
NFR-MAINT-004 — Consistent Coding Standards
Priority: Must
The codebase should follow consistent conventions for:
•	Naming
•	Folder structure
•	DTOs
•	Services
•	Interfaces
•	Error handling
•	Validation
•	Logging
•	API responses
________________________________________
NFR-MAINT-005 — Documentation
Priority: Should
Important architectural and business decisions should be documented.
Documentation should include:
•	Architecture
•	Database
•	API
•	Authentication
•	Multi-tenancy
•	Deployment
•	Important business rules
________________________________________
9. Usability Requirements
NFR-USAB-001 — Restaurant Dashboard Usability
Priority: Must
Restaurant users should be able to perform common operations without technical knowledge.
Common tasks include:
•	Updating restaurant information
•	Creating menu categories
•	Adding menu items
•	Changing prices
•	Managing availability
•	Viewing orders
•	Updating order status
•	Managing staff
•	Generating QR codes
________________________________________
NFR-USAB-002 — Customer Ordering Simplicity
Priority: Must
The customer ordering process should require a minimal number of steps.
Target flow:
Open Restaurant Website
        ↓
Browse Menu
        ↓
Select Items
        ↓
Cart
        ↓
Customer Information
        ↓
Confirm Order
        ↓
Order Created
________________________________________
NFR-USAB-003 — Mobile Usability
Priority: Must
The public restaurant website and ordering experience must be usable on mobile devices.
This is especially important because QR-based restaurant customers are expected to use smartphones.
________________________________________
NFR-USAB-004 — Clear Error Messages
Priority: Must
Users should receive understandable error messages.
Instead of:
500 Internal Server Error
where appropriate, the UI should communicate the actionable problem.
Example:
This menu item is currently unavailable.
________________________________________
10. Accessibility Requirements
NFR-ACCESS-001 — Keyboard Accessibility
Priority: Should
Administrative interfaces should support keyboard navigation for important operations.
________________________________________
NFR-ACCESS-002 — Semantic HTML
Priority: Should
The Angular frontend should use semantic HTML elements where appropriate.
________________________________________
NFR-ACCESS-003 — Accessible Forms
Priority: Should
Forms should provide:
•	Labels
•	Validation messages
•	Appropriate input types
•	Keyboard accessibility
•	Clear error states
________________________________________
NFR-ACCESS-004 — Visual Accessibility
Priority: Should
The UI should maintain sufficient contrast and readable typography.
________________________________________
11. Compatibility Requirements
NFR-COMP-001 — Browser Compatibility
Priority: Must
The public website and dashboard should support current versions of major browsers.
Target browsers include:
•	Google Chrome
•	Microsoft Edge
•	Mozilla Firefox
•	Safari
________________________________________
NFR-COMP-002 — Responsive Design
Priority: Must
The customer-facing website must support:
•	Desktop
•	Tablet
•	Mobile
________________________________________
NFR-COMP-003 — API Compatibility
Priority: Should
API changes should avoid unnecessarily breaking existing clients.
Future API versioning may be introduced when the platform reaches a stage where multiple client versions must be supported.
________________________________________
12. Observability Requirements
NFR-OBS-001 — Application Logging
Priority: Must
The backend must produce structured application logs for important events and failures.
Logs should support investigation of:
•	API errors
•	Authentication failures
•	Background job failures
•	External service failures
•	Important business operations
________________________________________
NFR-OBS-002 — Correlation ID
Priority: Should
Requests should have a correlation identifier that allows related operations to be traced across logs.
Example:
Request
   ↓
Controller
   ↓
Application Service
   ↓
Database
   ↓
Background Job
The correlation ID helps connect these events during troubleshooting.
________________________________________
NFR-OBS-003 — Health Checks
Priority: Should
The backend should expose health information for important infrastructure dependencies.
Examples:
•	API
•	Database
•	Background processing
•	Required external services
________________________________________
13. Logging Requirements
NFR-LOG-001 — Security Logging
Priority: Must
Security-sensitive events should be logged.
Examples:
•	Failed login
•	Successful login
•	Unauthorized access attempt
•	Account activation/deactivation
•	Role changes
•	Permission changes
________________________________________
NFR-LOG-002 — Business Audit Logging
Priority: Should
Important business operations should be auditable.
Examples:
Menu item created
Menu price changed
Order cancelled
Staff member invited
Staff role changed
Restaurant configuration published
________________________________________
NFR-LOG-003 — No Sensitive Information in Logs
Priority: Must
Logs must not contain sensitive information such as:
•	Passwords
•	Access tokens
•	Refresh tokens
•	Payment secrets
•	API keys
•	Unnecessary personal information
________________________________________
14. Data Integrity Requirements
NFR-DATA-001 — Referential Integrity
Priority: Must
The database must maintain valid relationships between related entities.
Examples:
Order → Restaurant
OrderItem → Order
OrderItem → MenuItem
MenuItem → Category
User → Tenant
________________________________________
NFR-DATA-002 — Valid State Transitions
Priority: Must
Business entities with lifecycle states must follow valid transitions.
Example:
New
 ↓
Confirmed
 ↓
Preparing
 ↓
Ready
 ↓
Completed
Invalid transitions must be rejected.
________________________________________
NFR-DATA-003 — Monetary Data Accuracy
Priority: Must
Prices, totals, discounts, allowances, and other monetary values must be represented using appropriate decimal-based types.
Floating-point arithmetic must not be used for authoritative monetary calculations.
________________________________________
NFR-DATA-004 — Data Consistency
Priority: Must
The system must prevent inconsistent data caused by partial operations.
Database transactions must be used where multiple changes must succeed or fail together.
________________________________________
15. Backup and Recovery Requirements
NFR-BACKUP-001 — Database Backup
Priority: Must
Production database data must be backed up according to an established backup policy.
________________________________________
NFR-BACKUP-002 — Backup Validation
Priority: Should
Backups should periodically be tested to verify that they can actually be restored.
A backup that cannot be restored is not considered a reliable recovery mechanism.
________________________________________
NFR-BACKUP-003 — Recovery Planning
Priority: Should
The system should define:
•	Recovery Point Objective (RPO)
•	Recovery Time Objective (RTO)
•	Backup frequency
•	Backup retention
•	Restoration procedure
Exact production values will be finalized when deployment infrastructure is selected.
________________________________________
16. API Requirements
NFR-API-001 — Consistent API Responses
Priority: Must
API responses should follow a consistent structure.
Example conceptual structure:
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
Error responses should follow a predictable structure as well.
________________________________________
NFR-API-002 — HTTP Status Codes
Priority: Must
The API must use HTTP status codes appropriately.
Examples:
200 → Successful request
201 → Resource created
400 → Validation/bad request
401 → Unauthenticated
403 → Unauthorized
404 → Resource not found
409 → Conflict
500 → Unexpected server error
________________________________________
NFR-API-003 — API Validation
Priority: Must
API endpoints must validate incoming requests before executing business operations.
________________________________________
NFR-API-004 — API Pagination
Priority: Must
Endpoints returning potentially large collections must support pagination.
________________________________________
NFR-API-005 — API Documentation
Priority: Should
The API should provide machine-readable and human-readable documentation.
For example:
•	OpenAPI
•	Swagger UI
________________________________________
17. Database Requirements
NFR-DB-001 — Relational Data Integrity
Priority: Must
The relational database must enforce appropriate:
•	Primary keys
•	Foreign keys
•	Unique constraints
•	Required fields
•	Indexes
•	Appropriate data types
________________________________________
NFR-DB-002 — Tenant-Aware Indexing
Priority: Must
Tenant-scoped high-volume tables should be designed with tenant-aware indexing where appropriate.
For example:
TenantId + OrderDate
TenantId + Status
TenantId + CreatedAt
The exact indexes will be determined during database design and query analysis.
________________________________________
NFR-DB-003 — Migration Management
Priority: Must
Database schema changes must be managed through version-controlled migrations.
________________________________________
18. Concurrency Requirements
NFR-CONC-001 — Concurrent Orders
Priority: Must
The system must support multiple customers placing orders for the same restaurant simultaneously.
________________________________________
NFR-CONC-002 — Concurrent Administrative Updates
Priority: Should
The system should handle cases where multiple restaurant staff members modify data concurrently.
________________________________________
NFR-CONC-003 — Order Status Concurrency
Priority: Must
The system must prevent inconsistent order state caused by simultaneous status updates.
Example:
Kitchen → Preparing
Cashier → Cancelled
The backend must validate whether each transition is still valid when the update occurs.
________________________________________
NFR-CONC-004 — Optimistic Concurrency
Priority: Should
Optimistic concurrency mechanisms should be considered for entities where simultaneous updates could overwrite important changes.
________________________________________
19. Rate Limiting Requirements
NFR-RATE-001 — API Rate Limiting
Priority: Should
Public and sensitive endpoints should be protected against excessive requests.
Particularly sensitive endpoints include:
•	Login
•	Registration
•	Password reset
•	OTP/verification
•	Public order creation
•	File upload
________________________________________
NFR-RATE-002 — Abuse Protection
Priority: Should
The platform should provide protection against automated abuse and excessive traffic.
________________________________________
20. Deployment Requirements
NFR-DEPLOY-001 — Environment Separation
Priority: Must
The application should support separate environments such as:
Development
Testing/Staging
Production
________________________________________
NFR-DEPLOY-002 — Configuration Management
Priority: Must
Environment-specific configuration must not be hard-coded into the source code.
Examples:
•	Database connection strings
•	JWT secrets
•	SMTP credentials
•	Storage credentials
•	External API keys
Secrets must be managed securely.
________________________________________
NFR-DEPLOY-003 — Automated Deployment
Priority: Should
The project should eventually support automated CI/CD deployment.
Typical pipeline:
Git Push
   ↓
Build
   ↓
Run Tests
   ↓
Validate
   ↓
Deploy
   ↓
Health Check
________________________________________
NFR-DEPLOY-004 — Database Migration Safety
Priority: Must
Production database migrations must be applied in a controlled manner.
Destructive schema changes must be carefully reviewed before deployment.
________________________________________
NFR-DEPLOY-005 — Rollback Capability
Priority: Should
The deployment process should provide a strategy for recovering from failed application deployments.
________________________________________
21. Privacy Requirements
NFR-PRIV-001 — Data Minimization
Priority: Must
The system should collect only customer and restaurant information necessary for the application's functionality.
________________________________________
NFR-PRIV-002 — Data Access Control
Priority: Must
Users must only access personal or tenant information required for their authorized operations.
________________________________________
NFR-PRIV-003 — Data Removal
Priority: Should
The system should provide mechanisms for appropriately deactivating or removing data according to business and legal requirements.
________________________________________
22. Security and Tenant-Isolation Verification
Because this is a multi-tenant SaaS application, tenant isolation must be tested explicitly.
The testing strategy must include scenarios such as:
User A → Tenant A
User B → Tenant B

User A requests:
Tenant B Menu
        ↓
Access denied
Testing must cover:
•	API endpoints
•	Database queries
•	Direct resource IDs
•	Public website resolution
•	SignalR
•	Background jobs
•	File access
•	Search/filter endpoints
•	Administrative operations
•	Authentication
•	Authorization
Tenant isolation must not be considered complete merely because normal UI navigation prevents cross-tenant access.
________________________________________
23. V1 Quality Targets
The following targets establish the initial quality baseline for Version 1.
Area	V1 Target
Tenant isolation	Mandatory
Authentication	Mandatory
Authorization	Mandatory
Server-side validation	Mandatory
Server-side pricing	Mandatory
HTTPS	Mandatory
Database integrity	Mandatory
Mobile public website	Mandatory
API pagination	Mandatory
Error handling	Mandatory
Structured logging	Mandatory
Order transaction integrity	Mandatory
SignalR tenant isolation	Mandatory
File tenant isolation	Mandatory
Production backups	Mandatory
Automated tests	Required
Health checks	Recommended
Rate limiting	Recommended
CI/CD	Recommended
Horizontal scaling	Architecture-ready
Advanced monitoring	Future/Incremental
________________________________________
24. NFR Traceability
Non-functional requirements will influence later SDLC documents.
Example:
NFR-SEC-003
Tenant Isolation
        ↓
Multi-Tenancy Architecture
        ↓
EF Core Tenant Query Filters
        ↓
Authorization
        ↓
API Resource Validation
        ↓
Integration Tests
Another example:
NFR-PERF-004
Database Query Performance
        ↓
ERD / Database Design
        ↓
Indexes
        ↓
EF Core Query Design
        ↓
API Performance Testing
Another example:
NFR-REL-003
Notification Reliability
        ↓
System Architecture
        ↓
Order Persistence
        ↓
SignalR
        ↓
Background/Retry Strategy
        ↓
Failure Testing
________________________________________
25. Key Architectural Constraints Derived from NFRs
The NFRs establish the following architectural constraints:
1.	Tenant isolation must be enforced on the server.
2.	Business-critical validation must occur on the backend.
3.	Order pricing must be calculated from authoritative server-side data.
4.	Public restaurant data must be tenant-aware.
5.	SignalR must be tenant-aware.
6.	Background jobs must preserve tenant context.
7.	Files must be tenant-isolated.
8.	Large collections must be paginated.
9.	Database queries must be designed for tenant-scale growth.
10.	The application should be stateless enough to support horizontal scaling.
11.	Sensitive configuration must be externalized from source code.
12.	Production failures must be observable through logging and monitoring.
13.	Critical database operations must preserve transactional integrity.
14.	The frontend must never be treated as a trusted security boundary.
15.	The architecture must allow future payment, delivery, multi-branch, and subscription capabilities without fundamentally redesigning the core platform.
________________________________________
26. NFR Acceptance Principle
A feature is not considered production-ready merely because its functional behavior works.
A feature is considered ready when:
Functional Correctness
        +
Security
        +
Tenant Isolation
        +
Performance
        +
Reliability
        +
Validation
        +
Observability
        +
Testability
        ↓
Production-Ready Feature
Therefore, every major feature introduced into the Restaurant SaaS Platform should be evaluated against both its Functional Requirements (FR) and applicable Non-Functional Requirements (NFR).
•	Rate limiting
•	Deployment requirements
These requirements are particularly important for this project because we are designing a real SaaS platform, not merely a restaurant CRUD application.
That will become the foundation for our use cases, API endpoints, database design, and development tasks.



05 — Business Rules
1. Document Purpose
This document defines the business rules governing the Restaurant SaaS Platform.
Business rules describe the conditions, constraints, calculations, validations, and state transitions that determine how the business operates.
Functional requirements answer:
What can the system do?
Business rules answer:
Under what conditions is the system allowed to do it, and what must happen when it does?
These rules will later be used to define:
•	Use Cases
•	User Stories
•	Domain Model
•	Entity behavior
•	ERD constraints
•	API validation
•	Authorization policies
•	Order workflows
•	Subscription behavior
•	Automated tests
________________________________________
2. Business Rule Identification
Each rule has a unique identifier.
Prefix	Area
BR-TENANT	Tenant
BR-USER	User & Identity
BR-REST	Restaurant
BR-STAFF	Staff
BR-MENU	Menu
BR-WEB	Website
BR-CART	Cart
BR-ORDER	Orders
BR-PRICE	Pricing
BR-QR	QR
BR-SUB	Subscription
BR-NOTIFY	Notifications
BR-FILE	Files
BR-AUDIT	Audit
BR-PLATFORM	Platform Administration
BR-SEC	Security
________________________________________
3. General Business Principles
BR-GEN-001 — Tenant Ownership
Every restaurant-owned business resource must belong to exactly one tenant.
Examples:
Restaurant
Menu
Category
MenuItem
Order
OrderItem
Staff
WebsiteConfiguration
QR Code
Subscription
File
________________________________________
BR-GEN-002 — Tenant Boundary
A tenant may access only resources belonging to that tenant unless the authenticated user has explicit platform-level authority.
________________________________________
BR-GEN-003 — Platform Authority
A Platform Administrator operates at the SaaS platform level and is not treated as an ordinary restaurant staff member.
Platform-level access must still be explicitly authorized.
________________________________________
BR-GEN-004 — Server Authority
The backend is the authoritative source for business rules.
Frontend validation improves user experience but must not replace backend validation.
________________________________________
4. Tenant Business Rules
BR-TENANT-001 — Tenant Represents a Restaurant
In V1, each tenant represents one restaurant business.
Tenant
   ↓
Restaurant
The architecture should not prevent future support for:
Tenant
   ↓
Multiple Branches
but multi-branch operation is outside V1.
________________________________________
BR-TENANT-002 — Unique Tenant Identifier
Every tenant must have a unique identifier.
The identifier must remain stable throughout the tenant's lifetime.
________________________________________
BR-TENANT-003 — Unique Tenant Slug
Each active tenant must have a unique URL-safe slug.
Example:
pizza-house
burger-point
sweet-cafe
The slug must not conflict with another tenant.
________________________________________
BR-TENANT-004 — Tenant Activation
A tenant must have an activation state.
Conceptually:
Pending
Active
Suspended
Deactivated
Only an active tenant may normally operate its public restaurant website and ordering system.
________________________________________
BR-TENANT-005 — Suspended Tenant
A suspended tenant must not be allowed to perform restricted business operations.
The exact restrictions may depend on the reason for suspension.
________________________________________
BR-TENANT-006 — Tenant Data Isolation
Tenant A must never access Tenant B's tenant-owned resources.
Example:
Tenant A
    └── Order 1001

Tenant B
    └── Order 2001
A Tenant A user requesting Order 2001 must receive an authorization/resource-protection failure.
________________________________________
BR-TENANT-007 — Tenant Context
Every tenant-scoped operation must execute using a validated tenant context.
The system must not rely solely on a TenantId supplied by the browser.
________________________________________
BR-TENANT-008 — Tenant Deactivation
Deactivating a tenant must not automatically delete its historical data.
Historical information should remain available to authorized platform administrators according to the platform's retention policy.
________________________________________
5. User and Identity Rules
BR-USER-001 — Unique Login Identity
A user account must have a unique login identity according to the authentication system's identity rules.
________________________________________
BR-USER-002 — User Must Be Active
A deactivated user must not authenticate successfully for normal application access.
________________________________________
BR-USER-003 — Tenant Membership
A restaurant-level user must have an association with a tenant.
Example:
User
  ↓
Tenant Membership
  ↓
Restaurant
________________________________________
BR-USER-004 — Role Does Not Determine Tenant
A role alone does not establish which restaurant the user belongs to.
For example:
Manager + Tenant A
does not mean:
Manager → all restaurants
The user's tenant membership determines the tenant scope.
________________________________________
BR-USER-005 — Role Determines Capability
A user's role determines which operations they may perform within their authorized tenant.
________________________________________
BR-USER-006 — Platform Administrator
A Platform Administrator may operate across tenants only through explicitly authorized platform-level functionality.
________________________________________
BR-USER-007 — Customer Account
V1 customers do not require a registered account to place an order.
A customer may place an order using required checkout information.
________________________________________
6. Restaurant Rules
BR-REST-001 — Restaurant Profile
Each tenant must have one primary restaurant profile in V1.
The profile may contain:
•	Name
•	Description
•	Logo
•	Phone
•	Email
•	Address
•	Opening hours
•	Status
________________________________________
BR-REST-002 — Restaurant Name
A restaurant must have a valid name before its public website can be published.
________________________________________
BR-REST-003 — Restaurant Status
A restaurant may have an operational status such as:
Open
Closed
TemporarilyUnavailable
The status controls whether customers can normally place orders.
________________________________________
BR-REST-004 — Opening Hours
Opening hours define the restaurant's expected operating schedule.
The system should be capable of determining whether the restaurant is currently within its configured operating hours.
________________________________________
BR-REST-005 — Closed Restaurant
A closed restaurant may still allow customers to view its public website and menu.
However, new online orders must not be accepted unless the business configuration explicitly permits pre-orders.
________________________________________
BR-REST-006 — Restaurant Deactivation
If the tenant is inactive or suspended, its public ordering functionality must be disabled.
________________________________________
7. Staff Business Rules
BR-STAFF-001 — Staff Belongs to Tenant
Every restaurant staff member must belong to the restaurant's tenant.
________________________________________
BR-STAFF-002 — Staff Role Required
Every active staff member must have an authorized restaurant role.
V1 roles:
Owner
Manager
Kitchen
Cashier
Waiter
________________________________________
BR-STAFF-003 — Owner Authority
The restaurant owner may perform owner-level restaurant management operations.
Examples:
•	Restaurant settings
•	Website configuration
•	Menu management
•	Staff management
•	Orders
•	Subscription-related operations where permitted
________________________________________
BR-STAFF-004 — Manager Authority
A Manager may perform operational tasks assigned to the Manager role.
The Manager must not automatically receive platform-level authority.
________________________________________
BR-STAFF-005 — Kitchen Authority
Kitchen Staff may access operations required for food preparation.
Typical capabilities:
View orders
Confirm/prep orders
Start preparation
Mark orders ready
________________________________________
BR-STAFF-006 — Cashier Authority
Cashiers may perform cashier-related order operations but must not automatically receive administrative authority.
________________________________________
BR-STAFF-007 — Waiter Authority
Waiters receive only the permissions explicitly assigned to their role.
________________________________________
BR-STAFF-008 — Staff Deactivation
A deactivated staff member must no longer be able to perform normal tenant operations.
Historical records associated with that staff member must not be deleted solely because the account was deactivated.
________________________________________
BR-STAFF-009 — Staff Role Change
A user's effective permissions must reflect their current role.
Existing authentication tokens may require re-authentication/token refresh depending on the authentication architecture.
________________________________________
8. Menu Category Rules
BR-MENU-001 — Category Belongs to Tenant
Every menu category belongs to exactly one tenant.
________________________________________
BR-MENU-002 — Category Name Required
A category must have a valid name.
________________________________________
BR-MENU-003 — Category Ordering
Categories may have a display order.
The public menu must display categories according to their configured order.
________________________________________
BR-MENU-004 — Category Availability
A category may be active or inactive.
Inactive categories must not normally appear as orderable categories on the public menu.
________________________________________
BR-MENU-005 — Category Deletion
A category containing active menu items must not be deleted without handling its associated menu items.
The system must explicitly define whether items are:
•	Reassigned
•	Archived
•	Soft-deleted
The preferred V1 behavior is to prevent unsafe deletion and require the restaurant user to resolve dependent items first.
________________________________________
9. Menu Item Rules
BR-MENU-006 — Menu Item Ownership
Every menu item must belong to one restaurant tenant.
________________________________________
BR-MENU-007 — Category Association
Every orderable menu item must belong to a valid category.
________________________________________
BR-MENU-008 — Menu Item Name
Every menu item must have a valid name before publication.
________________________________________
BR-MENU-009 — Menu Item Price
Every orderable menu item must have a valid non-negative price.
________________________________________
BR-MENU-010 — Menu Item Availability
A menu item may be:
Available
Unavailable
An unavailable item may remain visible to restaurant staff but must not be orderable by customers.
________________________________________
BR-MENU-011 — Menu Item Ordering
Menu items may have a display order within their category.
________________________________________
BR-MENU-012 — Menu Item Image
A menu item may have an associated image.
The image must satisfy the platform's file validation rules.
________________________________________
BR-MENU-013 — Menu Item Deletion
Deleting a menu item must not corrupt historical orders.
Historical order items must retain sufficient information to represent what the customer ordered.
Therefore, deleting a menu item must not cause an existing order's historical item information to disappear.
________________________________________
BR-MENU-014 — Historical Price Preservation
When a menu item's price changes, existing orders must retain the price that applied when those orders were created.
Example:
Menu Item Current Price = Rs. 600

Old Order:
Quantity = 2
Unit Price = Rs. 500

New Order:
Unit Price = Rs. 600
The old order must remain Rs. 500 per item.
________________________________________
10. Website and Publishing Rules
BR-WEB-001 — Website Configuration Belongs to Tenant
Each tenant's website configuration must belong to that tenant.
________________________________________
BR-WEB-002 — Template Selection
A restaurant may select an available website template.
The restaurant may customize supported configuration options without modifying application source code.
________________________________________
BR-WEB-003 — Theme Configuration
Supported theme settings may include:
•	Primary color
•	Secondary color
•	Font
•	Layout
•	Branding
•	Logo
Only supported configuration properties may be accepted.
________________________________________
BR-WEB-004 — Draft Configuration
Website changes may exist as draft configuration before publication.
________________________________________
BR-WEB-005 — Publishing
Only authorized restaurant users may publish website configuration.
________________________________________
BR-WEB-006 — Public Website Uses Published Configuration
The customer-facing website must use the restaurant's published configuration rather than arbitrary unpublished dashboard changes.
Conceptually:
Dashboard
    ↓
Draft Configuration
    ↓
Publish
    ↓
Published Configuration
    ↓
Public Website
________________________________________
BR-WEB-007 — Invalid Configuration
Invalid website configuration must not be published.
________________________________________
11. Public Website Rules
BR-WEB-008 — Tenant Resolution
A public restaurant website must resolve the correct tenant using a supported identifier such as:
restaurant.saas.com
or:
saas.com/restaurant
The selected approach will be finalized during architecture design.
________________________________________
BR-WEB-009 — Public Data Restriction
The public website must expose only information intended for customers.
Internal information such as:
•	Staff data
•	Internal IDs where unnecessary
•	Audit information
•	Administrative configuration
•	Private customer information
must not be exposed.
________________________________________
BR-WEB-010 — Inactive Restaurant
If a restaurant is inactive or suspended, its public ordering capability must be disabled.
The platform may display an appropriate unavailable/inactive page.
________________________________________
12. Cart Rules
BR-CART-001 — Cart Belongs to One Tenant
A customer's cart must contain items from only one restaurant tenant.
________________________________________
BR-CART-002 — Cross-Tenant Cart Prevention
A customer must not create a single cart containing:
Restaurant A Item
+
Restaurant B Item
________________________________________
BR-CART-003 — Quantity Must Be Positive
A cart item quantity must be greater than zero.
________________________________________
BR-CART-004 — Available Item Required
A customer may add an item only if it is currently orderable.
________________________________________
BR-CART-005 — Cart Price Is Not Authoritative
The price stored in the client-side cart must never be considered authoritative.
The backend must recalculate prices during checkout.
________________________________________
BR-CART-006 — Cart Validation
Before order creation, the backend must revalidate:
•	Restaurant status
•	Item existence
•	Item availability
•	Item price
•	Quantity
•	Tenant ownership
•	Any applicable business restrictions
________________________________________
13. Pricing Rules
BR-PRICE-001 — Server Controls Price
The server is the authoritative source for menu item pricing.
________________________________________
BR-PRICE-002 — Client Price Cannot Be Trusted
The customer may send:
{
  "menuItemId": 15,
  "quantity": 2,
  "unitPrice": 1
}
but the backend must ignore the supplied price when calculating the authoritative total.
________________________________________
BR-PRICE-003 — Order Price Snapshot
When an order is created, the system must store the applicable unit price on the order item.
Conceptually:
OrderItem
├── MenuItemId
├── Quantity
├── UnitPrice
└── LineTotal
________________________________________
BR-PRICE-004 — Line Total
The line total is calculated from the authoritative server-side price and quantity.
LineTotal = UnitPrice × Quantity
________________________________________
BR-PRICE-005 — Order Subtotal
The subtotal is the sum of all order item line totals.
Subtotal = Σ LineTotal
________________________________________
BR-PRICE-006 — Additional Charges
If the platform later supports:
•	Delivery fee
•	Service fee
•	Tax
•	Discount
these values must be calculated according to explicit server-side business rules.
________________________________________
BR-PRICE-007 — Monetary Precision
Money must use an appropriate decimal representation.
Floating-point values must not be used for authoritative financial calculations.
________________________________________
14. Order Creation Rules
BR-ORDER-001 — Order Must Belong to One Tenant
Every order belongs to exactly one restaurant tenant.
________________________________________
BR-ORDER-002 — Order Requires Valid Customer Information
The customer must provide the minimum information required by the restaurant's configured ordering process.
For V1, this may include:
•	Customer name
•	Phone number
•	Delivery/pickup information where applicable
________________________________________
BR-ORDER-003 — Order Must Contain Items
An order cannot be created with zero order items.
________________________________________
BR-ORDER-004 — Order Items Must Belong to Same Tenant
All order items must belong to the same restaurant as the order.
________________________________________
BR-ORDER-005 — Order Number
Each order must have a customer/staff-friendly order number.
The order number must be unique within the required business scope.
________________________________________
BR-ORDER-006 — Order Creation Is Atomic
Order creation must either:
Complete Successfully
or:
Fail Without Leaving Invalid Partial Data
________________________________________
BR-ORDER-007 — Order Total
The total must be calculated by the server.
The customer cannot determine the authoritative final amount.
________________________________________
15. Order Status Rules
BR-ORDER-008 — Initial Status
A successfully created order initially enters:
New
________________________________________
BR-ORDER-009 — Valid Order Lifecycle
The standard V1 lifecycle is:
New
 ↓
Confirmed
 ↓
Preparing
 ↓
Ready
 ↓
Completed
________________________________________
BR-ORDER-010 — Cancellation
An order may enter:
Cancelled
only when cancellation is permitted by business rules.
________________________________________
BR-ORDER-011 — Invalid Status Transition
The system must reject invalid state transitions.
Example:
Completed → Preparing
must not be allowed.
________________________________________
BR-ORDER-012 — Status Transition Authority
Different roles may have different authority over order status changes.
Example:
Transition	Typical Authorized Role
New → Confirmed	Manager / Cashier
Confirmed → Preparing	Kitchen
Preparing → Ready	Kitchen
Ready → Completed	Cashier / Manager
Cancel	Authorized staff
The final permission matrix will be defined during authorization design.
________________________________________
BR-ORDER-013 — Completed Orders
A completed order must be treated as historical business data.
It must not be casually modified in ways that alter its historical financial information.
________________________________________
BR-ORDER-014 — Cancelled Orders
A cancelled order must retain its history rather than being physically removed.
________________________________________
16. Order History Rules
BR-ORDER-015 — Historical Snapshot
Historical orders must preserve the information necessary to understand the transaction at the time it occurred.
At minimum:
Item
Quantity
Unit Price
Line Total
Order Total
________________________________________
BR-ORDER-016 — Menu Changes Do Not Rewrite History
Changing or deleting a menu item must not change historical order totals.
________________________________________
17. Real-Time Notification Rules
BR-NOTIFY-001 — New Order Notification
When a new order is successfully created, authorized restaurant users should receive a real-time notification.
________________________________________
BR-NOTIFY-002 — Persistence Before Notification
The system must persist the order before treating the real-time notification as successful.
Conceptually:
Validate
   ↓
Create Order
   ↓
Commit Database Transaction
   ↓
Publish SignalR Event
________________________________________
BR-NOTIFY-003 — Tenant-Specific Notification
A restaurant must receive notifications only for its own tenant.
________________________________________
BR-NOTIFY-004 — Notification Failure Does Not Delete Order
If SignalR is unavailable, the order must remain persisted.
________________________________________
18. QR Code Rules
BR-QR-001 — Restaurant-Specific QR
Each restaurant QR code must resolve to that restaurant's public website/menu.
________________________________________
BR-QR-002 — QR Does Not Grant Authorization
A QR code is a public navigation mechanism.
Possession of a restaurant QR code must not grant administrative access.
________________________________________
BR-QR-003 — QR Regeneration
Authorized restaurant users may regenerate a QR code if supported.
________________________________________
BR-QR-004 — Inactive Restaurant QR
A QR code may still resolve successfully but must display an appropriate inactive/unavailable state when the restaurant is not operational.
________________________________________
19. Subscription Rules
BR-SUB-001 — Tenant Subscription
A tenant may have an associated subscription.
________________________________________
BR-SUB-002 — Subscription States
V1 may support:
Trial
Active
PastDue
Suspended
Cancelled
Expired
The exact lifecycle will be finalized when subscription billing is implemented.
________________________________________
BR-SUB-003 — Subscription Determines Access
Subscription state may determine access to platform capabilities.
Example:
Active
    ↓
Full Plan Features

Suspended
    ↓
Restricted Access
________________________________________
BR-SUB-004 — Feature Limits
A subscription plan may define limits such as:
•	Number of menu items
•	Number of staff
•	Storage
•	Number of branches in future plans
•	Advanced features
The system must enforce these limits server-side.
________________________________________
BR-SUB-005 — Subscription Does Not Break Historical Data
Subscription suspension or cancellation must not automatically delete historical:
•	Orders
•	Menu history where retained
•	Audit records
•	Restaurant configuration
•	Business data
________________________________________
20. File Rules
BR-FILE-001 — Tenant Ownership
Every restaurant-uploaded file must be associated with the correct tenant.
________________________________________
BR-FILE-002 — File Validation
Files must be validated for:
•	Allowed type
•	File size
•	Extension
•	Storage path/key
•	Tenant ownership
________________________________________
BR-FILE-003 — File Access
Private tenant files must not be publicly accessible unless explicitly intended.
________________________________________
BR-FILE-004 — File Deletion
Deleting a file must not leave invalid references in business data.
________________________________________
21. Notification Rules
BR-NOTIFY-005 — Notification Types
The platform may support:
In-App
Real-Time
Email
________________________________________
BR-NOTIFY-006 — Notification Tenant Boundary
Tenant-specific notifications must be delivered only to authorized users of the relevant tenant.
________________________________________
BR-NOTIFY-007 — Email Failure
Email delivery failure must not automatically roll back unrelated successful business operations.
For example:
Order Created
     ↓
Email Failed
The order remains created.
The email operation should be retried where appropriate.
________________________________________
22. Audit Rules
BR-AUDIT-001 — Sensitive Operations
Important security and business operations should generate audit records.
Examples:
•	User role changed
•	Staff deactivated
•	Menu price changed
•	Order cancelled
•	Tenant suspended
•	Subscription changed
•	Website published
________________________________________
BR-AUDIT-002 — Audit Immutability
Audit records should not be casually modified by ordinary restaurant users.
________________________________________
BR-AUDIT-003 — Audit Tenant Isolation
Restaurant users may access only audit information belonging to their authorized tenant.
Platform administrators may access platform-level audit information according to their permissions.
________________________________________
23. Platform Administration Rules
BR-PLATFORM-001 — Tenant Creation
Only authorized platform users may create tenants through platform administration functionality.
________________________________________
BR-PLATFORM-002 — Tenant Activation
Only authorized platform users may activate or deactivate a tenant.
________________________________________
BR-PLATFORM-003 — Platform User Management
Platform-level user management must be separate from restaurant staff management.
________________________________________
BR-PLATFORM-004 — Platform Actions Must Be Auditable
Important platform-level actions should be recorded.
________________________________________
24. Security Business Rules
BR-SEC-001 — No Client Trust
The server must not trust client-provided:
TenantId
Role
Permission
Price
OrderTotal
UserId
when those values can be determined authoritatively by the server.
________________________________________
BR-SEC-002 — Direct ID Manipulation
Changing an ID in a URL or request must never allow access to another tenant's resource.
Example:
/api/orders/100
changing to:
/api/orders/101
must still undergo tenant and authorization checks.
________________________________________
BR-SEC-003 — Role Escalation Prevention
A restaurant user must not be able to assign themselves a higher-privileged role.
________________________________________
BR-SEC-004 — Tenant Escalation Prevention
A restaurant user must not be able to change their tenant association through normal client requests.
________________________________________
BR-SEC-005 — Authorization Before Business Operation
Authorization must be evaluated before performing a protected business operation.
________________________________________
25. Soft Deletion Rules
BR-DATA-001 — Historical Data Preservation
Entities that participate in historical transactions should generally not be physically deleted when deletion would destroy business history.
Examples:
MenuItem
Order
OrderItem
Staff
________________________________________
BR-DATA-002 — Soft Delete
Where appropriate, records may use a soft-delete mechanism such as:
IsDeleted
DeletedAt
DeletedBy
________________________________________
BR-DATA-003 — Soft-Deleted Records
Soft-deleted records must not normally appear in active queries.
Historical references may still remain available where required.
________________________________________
26. Business Rule Conflict Resolution
When two business rules appear to conflict, the following priority applies:
Security
   ↓
Data Integrity
   ↓
Financial Accuracy
   ↓
Authorization
   ↓
Core Business Rules
   ↓
User Experience
For example:
If allowing a frontend shortcut would improve UX but compromise tenant isolation, tenant isolation takes precedence.
________________________________________
27. Core V1 Business Rules
The following rules are considered critical to the V1 domain model:
Rule	Description
BR-TENANT-006	Tenant data isolation
BR-TENANT-007	Valid tenant context
BR-USER-004	Role does not determine tenant
BR-MENU-006	Menu item tenant ownership
BR-MENU-013	Historical order protection
BR-MENU-014	Historical price preservation
BR-CART-001	One tenant per cart
BR-CART-006	Checkout revalidation
BR-PRICE-001	Server-authoritative pricing
BR-PRICE-003	Order price snapshot
BR-ORDER-004	Order items same tenant
BR-ORDER-006	Atomic order creation
BR-ORDER-009	Valid order lifecycle
BR-ORDER-011	Invalid transitions rejected
BR-NOTIFY-002	Persist order before notification
BR-NOTIFY-003	Tenant-specific notification
BR-SUB-004	Server-side feature limits
BR-FILE-001	Tenant file ownership
BR-SEC-001	No client trust
BR-SEC-002	Direct ID manipulation protection
BR-SEC-003	Role escalation prevention
BR-SEC-004	Tenant escalation prevention
________________________________________
28. Core Domain Flow
The primary V1 customer ordering flow is governed by the following rules:
Customer
   ↓
Resolve Restaurant/Tenant
   ↓
Load Published Website
   ↓
Load Available Menu
   ↓
Add Menu Items
   ↓
Tenant Boundary Check
   ↓
Cart Validation
   ↓
Checkout
   ↓
Revalidate Menu Items
   ↓
Revalidate Availability
   ↓
Read Server Prices
   ↓
Calculate Order Total
   ↓
Create Order + Order Items
   ↓
Commit Transaction
   ↓
Publish Tenant-Specific Notification
   ↓
Restaurant Processes Order
________________________________________
29. Order Lifecycle
The authoritative V1 order state machine is:
                    ┌─────────────┐
                    │     New     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Confirmed  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Preparing  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Ready    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Completed  │
                    └─────────────┘

New / Confirmed / Preparing / Ready
              │
              ▼
         ┌───────────┐
         │ Cancelled │
         └───────────┘
The exact cancellation transitions will be finalized in the Use Case and authorization documents.
________________________________________
30. Business Rule Traceability
Business rules will connect later SDLC documents.
Example:
BR-PRICE-001
Server Controls Price
        ↓
UC-CHECKOUT-001
Create Order
        ↓
Order Service
        ↓
MenuItem.Price
        ↓
OrderItem.UnitPrice
        ↓
Order.Total
        ↓
Integration Test
Another example:
BR-TENANT-006
Tenant Data Isolation
        ↓
Multi-Tenancy Architecture
        ↓
TenantContext
        ↓
EF Core Query Filtering
        ↓
Authorization
        ↓
Cross-Tenant Security Tests
________________________________________
31. Business Rule Design Principle
Business rules should be implemented at the appropriate domain/application boundary rather than duplicated throughout the frontend.
For example, the rule:
A customer cannot order an unavailable menu item.
must not exist only inside Angular.
The authoritative rule belongs on the backend.
Angular may additionally implement the rule for user experience:
Backend → Security + Business Authority
Frontend → User Experience + Early Validation
________________________________________
32. Future Business Rules
The following business areas are intentionally not fully defined in V1:
•	Online payment processing
•	Delivery zones
•	Delivery fees
•	Tax calculation
•	Discounts and coupons
•	Promotions
•	Loyalty points
•	Reservations
•	Multi-branch restaurants
•	Table ordering
•	Inventory
•	Restaurant-specific payment accounts
•	Advanced subscription billing
•	Custom domains
•	Advanced analytics
These should be introduced as separate business-rule sets when the corresponding features are formally added to scope.
________________________________________
33. Business Rules Completion Criteria
The Business Rules phase is considered complete for V1 when:
1.	Tenant ownership rules are defined.
2.	User and role rules are defined.
3.	Restaurant lifecycle rules are defined.
4.	Staff authorization boundaries are defined.
5.	Menu rules are defined.
6.	Website publishing rules are defined.
7.	Cart rules are defined.
8.	Pricing rules are defined.
9.	Order lifecycle rules are defined.
10.	Historical data rules are defined.
11.	Subscription rules are defined at the V1 level.
12.	File ownership rules are defined.
13.	Notification rules are defined.
14.	Audit rules are defined.
15.	Security-related business constraints are defined.
16.	Rules have unique identifiers for later traceability.
These rules form the behavioral foundation for the next SDLC stages.
06 — Use Case Specification
1. Document Purpose
This document defines the major Use Cases of the Restaurant SaaS Platform.
A Use Case describes how an actor interacts with the system to achieve a specific business goal.
The Use Cases are derived from:
•	Product Vision
•	Functional Requirements
•	Non-Functional Requirements
•	Business Rules
•	Stakeholder and Role definitions
They will later provide the foundation for:
•	User Stories
•	Domain Model
•	API endpoints
•	Angular screens
•	Authorization rules
•	Integration tests
•	End-to-end tests
________________________________________
2. Use Case Structure
Each Use Case contains:
•	Use Case ID
•	Name
•	Primary Actor
•	Supporting Actors
•	Goal
•	Preconditions
•	Trigger
•	Main Success Flow
•	Alternative Flows
•	Exception Flows
•	Postconditions
•	Related Business Rules
•	Related Functional Requirements
________________________________________
3. Actors
The primary actors are:
Actor	Description
Platform Administrator	Manages the SaaS platform
Restaurant Owner	Owns and manages a restaurant tenant
Restaurant Manager	Manages restaurant operations
Kitchen Staff	Processes food preparation
Cashier	Handles cashier/order operations
Waiter	Performs permitted restaurant operations
Customer	Browses restaurant website and places orders
Email Service	Sends email notifications
File Storage	Stores uploaded files
SignalR	Delivers real-time notifications
Background Job System	Executes asynchronous/scheduled operations
________________________________________
4. Use Case Catalogue
Platform & Tenant
ID	Use Case
UC-TENANT-001	Create Tenant
UC-TENANT-002	Activate Tenant
UC-TENANT-003	Deactivate Tenant
UC-TENANT-004	View Tenant Details
UC-TENANT-005	Manage Tenant Subscription
Authentication
ID	Use Case
UC-AUTH-001	Register User
UC-AUTH-002	Login
UC-AUTH-003	Logout
UC-AUTH-004	Change Password
UC-AUTH-005	Reset Password
UC-AUTH-006	Manage User Authorization
Restaurant
ID	Use Case
UC-REST-001	Configure Restaurant
UC-REST-002	Configure Opening Hours
UC-REST-003	Change Restaurant Status
Staff
ID	Use Case
UC-STAFF-001	View Staff
UC-STAFF-002	Invite Staff
UC-STAFF-003	Assign Staff Role
UC-STAFF-004	Update Staff
UC-STAFF-005	Deactivate Staff
Menu
ID	Use Case
UC-MENU-001	Create Category
UC-MENU-002	Update Category
UC-MENU-003	Delete Category
UC-MENU-004	Reorder Categories
UC-MENU-005	Create Menu Item
UC-MENU-006	Update Menu Item
UC-MENU-007	Delete Menu Item
UC-MENU-008	Change Item Availability
UC-MENU-009	Reorder Menu Items
Website
ID	Use Case
UC-WEB-001	Configure Website
UC-WEB-002	Select Website Template
UC-WEB-003	Configure Theme
UC-WEB-004	Preview Website
UC-WEB-005	Publish Website
Customer
ID	Use Case
UC-PUBLIC-001	Open Restaurant Website
UC-PUBLIC-002	Browse Menu
UC-PUBLIC-003	View Menu Item
UC-CART-001	Add Item to Cart
UC-CART-002	Update Cart
UC-CART-003	Remove Cart Item
UC-CHECKOUT-001	Checkout
UC-CHECKOUT-002	Create Order
Orders
ID	Use Case
UC-ORDER-001	View Orders
UC-ORDER-002	View Order Details
UC-ORDER-003	Confirm Order
UC-ORDER-004	Start Preparing Order
UC-ORDER-005	Mark Order Ready
UC-ORDER-006	Complete Order
UC-ORDER-007	Cancel Order
QR
ID	Use Case
UC-QR-001	Generate QR Code
UC-QR-002	Regenerate QR Code
UC-QR-003	Download QR Code
Files
ID	Use Case
UC-FILE-001	Upload Restaurant Logo
UC-FILE-002	Upload Menu Image
UC-FILE-003	Delete File
Notifications
ID	Use Case
UC-NOTIFY-001	Receive New Order Notification
UC-NOTIFY-002	Send Email Notification
Administration
ID	Use Case
UC-ADMIN-001	Manage Platform Users
UC-ADMIN-002	View Platform Audit Information
________________________________________
5. UC-AUTH-001 — Register User
Primary Actor
Customer / Restaurant User
Goal
Create a valid user account.
Preconditions
•	Registration is enabled.
•	Required registration information is provided.
Trigger
The user submits the registration form.
Main Success Flow
1.	User opens registration.
2.	User enters required information.
3.	System validates the input.
4.	System checks whether the identity already exists.
5.	System creates the user account.
6.	System assigns the appropriate initial role/context.
7.	System returns successful registration result.
Alternative Flow
If the email already exists:
1.	Registration is rejected.
2.	System informs the user that the account already exists.
Exception Flow
If database or infrastructure failure occurs:
1.	Registration fails.
2.	Failure is logged.
3.	User receives an appropriate error response.
Postconditions
A valid user account exists.
Related Rules
•	BR-USER-001
•	BR-USER-002
•	BR-SEC-001
________________________________________
6. UC-AUTH-002 — Login
Primary Actor
User
Goal
Authenticate and access authorized functionality.
Main Success Flow
1.	User submits credentials.
2.	System validates credentials.
3.	System verifies account status.
4.	System determines role.
5.	System determines tenant membership where applicable.
6.	System creates authentication result.
7.	User accesses authorized functionality.
Alternative Flow
Invalid credentials:
Login
 ↓
Credentials Invalid
 ↓
Authentication Failed
Postconditions
The user is authenticated or the request is rejected.
Related Rules
•	BR-USER-002
•	BR-USER-003
•	BR-USER-004
•	BR-SEC-001
________________________________________
7. UC-TENANT-001 — Create Tenant
Primary Actor
Platform Administrator
Goal
Create a new restaurant tenant.
Preconditions
•	Platform Administrator is authenticated.
•	Administrator has tenant-management permission.
Main Success Flow
1.	Administrator opens tenant management.
2.	Administrator enters restaurant/tenant information.
3.	System validates the information.
4.	System checks tenant slug uniqueness.
5.	System creates the tenant.
6.	System creates the associated restaurant profile.
7.	System assigns the initial owner where applicable.
8.	System records the operation.
Postconditions
A new tenant exists.
Related Rules
•	BR-TENANT-001
•	BR-TENANT-002
•	BR-TENANT-003
•	BR-REST-001
________________________________________
8. UC-REST-001 — Configure Restaurant
Primary Actor
Restaurant Owner / Manager
Goal
Configure restaurant information.
Main Success Flow
1.	User opens restaurant settings.
2.	System loads the current restaurant configuration.
3.	User modifies permitted information.
4.	System validates the changes.
5.	System saves the changes.
6.	System records the operation where auditing is required.
Examples
The user may update:
•	Restaurant name
•	Description
•	Phone
•	Email
•	Address
•	Logo
•	Opening hours
Related Rules
•	BR-REST-001
•	BR-REST-002
•	BR-SEC-001
________________________________________
9. UC-STAFF-002 — Invite Staff
Primary Actor
Restaurant Owner / Manager
Goal
Add a staff member to the restaurant.
Main Success Flow
1.	Authorized user opens staff management.
2.	User enters staff information.
3.	User selects an allowed role.
4.	System validates the role.
5.	System creates the staff invitation/account workflow.
6.	System associates the user with the current tenant.
7.	Invitation is sent where email functionality is enabled.
8.	Operation is logged.
Security Rule
The requesting user must not be able to assign a role beyond their authorization.
Related Rules
•	BR-STAFF-001
•	BR-STAFF-002
•	BR-STAFF-008
•	BR-SEC-003
•	BR-SEC-004
________________________________________
10. UC-MENU-001 — Create Category
Primary Actor
Restaurant Owner / Manager
Goal
Create a menu category.
Main Success Flow
1.	User opens menu management.
2.	User selects "Create Category".
3.	User enters category name.
4.	System validates the request.
5.	System associates the category with the current tenant.
6.	System saves the category.
7.	Category becomes available to authorized restaurant users.
Postconditions
A tenant-owned category exists.
Related Rules
•	BR-MENU-001
•	BR-MENU-002
•	BR-MENU-003
________________________________________
11. UC-MENU-005 — Create Menu Item
Primary Actor
Restaurant Owner / Manager
Goal
Add a menu item to a restaurant menu.
Main Success Flow
1.	User selects a category.
2.	User selects "Create Menu Item".
3.	User enters:
o	Name
o	Description
o	Price
o	Image
o	Availability
4.	System validates the request.
5.	System verifies category ownership.
6.	System creates the menu item.
7.	System associates the item with the tenant.
8.	System saves the item.
Exception Flow
If the category belongs to another tenant:
Request
 ↓
Tenant validation fails
 ↓
Operation rejected
Related Rules
•	BR-MENU-006
•	BR-MENU-007
•	BR-MENU-009
•	BR-SEC-002
________________________________________
12. UC-WEB-005 — Publish Website
Primary Actor
Restaurant Owner / Authorized Manager
Goal
Make restaurant website configuration publicly available.
Main Success Flow
1.	User opens website configuration.
2.	System loads draft configuration.
3.	User previews changes.
4.	System validates configuration.
5.	User selects Publish.
6.	System stores/publishes the configuration.
7.	Public website begins using the published configuration.
Related Rules
•	BR-WEB-004
•	BR-WEB-005
•	BR-WEB-006
•	BR-WEB-007
________________________________________
13. UC-PUBLIC-001 — Open Restaurant Website
Primary Actor
Customer
Goal
Access a specific restaurant's public website.
Main Success Flow
1.	Customer opens the restaurant URL.
2.	System resolves the restaurant identifier.
3.	System resolves the tenant.
4.	System verifies that the restaurant is available for public access.
5.	System loads published website configuration.
6.	System loads public restaurant information.
7.	Website is rendered.
Exception Flow
Restaurant does not exist:
Invalid Restaurant
 ↓
Not Found
Restaurant is inactive:
Restaurant Found
 ↓
Inactive
 ↓
Unavailable Page
Related Rules
•	BR-TENANT-007
•	BR-WEB-008
•	BR-WEB-009
•	BR-WEB-010
________________________________________
14. UC-PUBLIC-002 — Browse Menu
Primary Actor
Customer
Goal
View the restaurant's available menu.
Main Success Flow
1.	Customer opens restaurant website.
2.	System loads published menu.
3.	System loads active categories.
4.	System loads available menu items.
5.	System displays the menu according to configured ordering.
Related Rules
•	BR-MENU-003
•	BR-MENU-004
•	BR-MENU-010
•	BR-WEB-009
________________________________________
15. UC-CART-001 — Add Item to Cart
Primary Actor
Customer
Goal
Add a menu item to the current order.
Main Success Flow
1.	Customer selects a menu item.
2.	Customer specifies quantity.
3.	System validates item availability.
4.	System verifies tenant ownership.
5.	System adds the item to the cart.
6.	Cart total is displayed.
Alternative Flow
If the cart belongs to another restaurant:
Existing Cart
Restaurant A

Customer selects:
Restaurant B Item

System
 ↓
Reject mixed-tenant cart
The UI may ask the customer whether to clear the existing cart before continuing.
Related Rules
•	BR-CART-001
•	BR-CART-002
•	BR-CART-003
•	BR-CART-004
________________________________________
16. UC-CHECKOUT-001 — Checkout
Primary Actor
Customer
Goal
Submit a valid cart for ordering.
Preconditions
•	Cart contains at least one item.
•	Restaurant is accepting orders.
Main Success Flow
1.	Customer opens checkout.
2.	System loads the cart.
3.	System validates tenant.
4.	System validates restaurant status.
5.	System validates each menu item.
6.	System verifies item availability.
7.	System retrieves authoritative prices.
8.	System recalculates line totals.
9.	System calculates order total.
10.	Customer provides required information.
11.	System validates customer information.
12.	System creates the order.
13.	System commits the transaction.
14.	System triggers the restaurant notification.
15.	Customer receives order confirmation.
Critical Rule
The price supplied by the client must not be trusted.
Related Rules
•	BR-CART-006
•	BR-PRICE-001
•	BR-PRICE-002
•	BR-PRICE-003
•	BR-ORDER-006
________________________________________
17. UC-ORDER-001 — View Orders
Primary Actor
Restaurant Staff
Goal
View orders belonging to the current restaurant.
Main Success Flow
1.	Staff opens order management.
2.	System identifies tenant.
3.	System retrieves tenant orders.
4.	System applies authorization.
5.	System returns paginated results.
6.	Staff views orders.
Security Requirement
The query must not return orders belonging to another tenant.
Related Rules
•	BR-TENANT-006
•	BR-ORDER-001
•	BR-SEC-002
________________________________________
18. UC-ORDER-003 — Confirm Order
Primary Actor
Authorized Restaurant Staff
Goal
Confirm a newly received order.
Preconditions
Order status is:
New
Main Success Flow
1.	Staff opens order.
2.	System verifies tenant ownership.
3.	System verifies staff authorization.
4.	System verifies current order status.
5.	System changes status:
New → Confirmed
6.	System records the status change.
7.	Relevant users may receive a real-time update.
Exception
If the order is no longer New, the transition is rejected.
Related Rules
•	BR-ORDER-009
•	BR-ORDER-011
•	BR-ORDER-012
________________________________________
19. UC-ORDER-004 — Start Preparing Order
Primary Actor
Kitchen Staff
Preconditions
Order status:
Confirmed
Main Success Flow
1.	Kitchen Staff selects the order.
2.	System verifies tenant.
3.	System verifies permission.
4.	System verifies status.
5.	System changes:
Confirmed → Preparing
6.	System records the transition.
7.	Relevant users receive an update.
________________________________________
20. UC-ORDER-005 — Mark Order Ready
Primary Actor
Kitchen Staff
Preconditions
Order status:
Preparing
Main Success Flow
1.	Kitchen Staff completes preparation.
2.	Staff marks order ready.
3.	System validates authorization.
4.	System validates current state.
5.	System changes:
Preparing → Ready
6.	System notifies relevant restaurant users.
________________________________________
21. UC-ORDER-006 — Complete Order
Primary Actor
Cashier / Manager / Authorized Staff
Preconditions
Order status:
Ready
Main Success Flow
1.	Staff opens order.
2.	System validates authorization.
3.	System validates current state.
4.	System changes:
Ready → Completed
5.	System records the transition.
6.	Order becomes historical completed business data.
________________________________________
22. UC-ORDER-007 — Cancel Order
Primary Actor
Authorized Restaurant Staff
Goal
Cancel an order when business rules permit.
Main Success Flow
1.	Staff selects order.
2.	System verifies tenant ownership.
3.	System verifies cancellation permission.
4.	System verifies current status.
5.	System changes status to:
Cancelled
6.	System records cancellation.
7.	Relevant users are notified.
Important Rule
Cancellation must not delete the order.
________________________________________
23. UC-QR-001 — Generate QR Code
Primary Actor
Restaurant Owner / Authorized Manager
Goal
Generate a QR code linking customers to the restaurant website.
Main Success Flow
1.	User opens QR management.
2.	System resolves current tenant.
3.	System generates restaurant-specific URL.
4.	QR code is generated.
5.	QR information is associated with the restaurant.
6.	User can view/download the QR code.
Security
The QR code grants public access only to the restaurant's public website.
It does not grant administrative access.
________________________________________
24. UC-SUB-001 — Manage Subscription
Primary Actor
Restaurant Owner / Platform Administrator
Goal
Manage the restaurant's subscription status and plan.
Main Success Flow
1.	Authorized user opens subscription management.
2.	System loads current subscription.
3.	User selects an available plan/action.
4.	System validates eligibility.
5.	System updates subscription state.
6.	System applies applicable feature limits.
7.	Operation is recorded.
Payment integration is outside the initial V1 business scope unless explicitly added.
________________________________________
25. UC-ADMIN-001 — Manage Platform Users
Primary Actor
Platform Administrator
Goal
Manage platform-level users and administrators.
Main Success Flow
1.	Administrator opens platform user management.
2.	System verifies platform authorization.
3.	Administrator views users.
4.	Administrator performs permitted operation.
5.	System validates changes.
6.	System records sensitive changes.
________________________________________
26. Cross-Cutting Use Case Rules
Every protected restaurant use case must perform the following conceptual checks:
Authentication
      ↓
Tenant Context
      ↓
Authorization
      ↓
Resource Ownership
      ↓
Business Rule Validation
      ↓
Operation
      ↓
Audit/Notification where required
This sequence is especially important for tenant-sensitive operations.
________________________________________
27. Public Ordering Use Case Relationship
The major customer ordering use cases form one business workflow:
UC-PUBLIC-001
Open Restaurant Website
        ↓
UC-PUBLIC-002
Browse Menu
        ↓
UC-CART-001
Add Item
        ↓
UC-CART-002
Update Cart
        ↓
UC-CHECKOUT-001
Checkout
        ↓
UC-CHECKOUT-002
Create Order
        ↓
UC-NOTIFY-001
Notify Restaurant
________________________________________
28. Restaurant Order Processing Relationship
Restaurant operations follow:
New
 ↓
UC-ORDER-003
Confirm Order
 ↓
Confirmed
 ↓
UC-ORDER-004
Start Preparing
 ↓
Preparing
 ↓
UC-ORDER-005
Mark Ready
 ↓
Ready
 ↓
UC-ORDER-006
Complete Order
 ↓
Completed
Cancellation can occur only from states where the business rules permit it.
________________________________________
29. Use Case Security Boundary
For every tenant-scoped use case, the system must verify:
Who is the user?
       ↓
What role/permission do they have?
       ↓
Which tenant do they belong to?
       ↓
Does the requested resource belong to that tenant?
       ↓
Is the requested business operation currently valid?
A successful authentication alone is therefore insufficient.
________________________________________
30. Use Case Traceability
Use Cases connect the previous SDLC documents to future implementation.
Example:
FR-CHECKOUT-003
Create Order
        ↓
UC-CHECKOUT-001
Checkout
        ↓
BR-PRICE-001
Server Controls Price
        ↓
Order Domain Logic
        ↓
POST /api/orders
        ↓
Order Database Tables
        ↓
Angular Checkout
        ↓
Integration Tests
Another example:
FR-MENU-007
Create Menu Item
        ↓
UC-MENU-005
Create Menu Item
        ↓
BR-MENU-006
Tenant Ownership
        ↓
POST /api/menu-items
        ↓
MenuItem Entity
        ↓
MenuItemForm
        ↓
Authorization + Tenant Tests
________________________________________
31. V1 Critical Use Cases
The following Use Cases are considered critical for the first production version:
1.	UC-AUTH-002 — Login
2.	UC-TENANT-001 — Create Tenant
3.	UC-REST-001 — Configure Restaurant
4.	UC-STAFF-002 — Invite Staff
5.	UC-MENU-001 — Create Category
6.	UC-MENU-005 — Create Menu Item
7.	UC-WEB-005 — Publish Website
8.	UC-PUBLIC-001 — Open Restaurant Website
9.	UC-PUBLIC-002 — Browse Menu
10.	UC-CART-001 — Add Item to Cart
11.	UC-CHECKOUT-001 — Checkout
12.	UC-CHECKOUT-002 — Create Order
13.	UC-ORDER-001 — View Orders
14.	UC-ORDER-003 — Confirm Order
15.	UC-ORDER-004 — Start Preparing Order
16.	UC-ORDER-005 — Mark Order Ready
17.	UC-ORDER-006 — Complete Order
18.	UC-ORDER-007 — Cancel Order
19.	UC-NOTIFY-001 — Receive New Order Notification
20.	UC-QR-001 — Generate QR Code
________________________________________
32. Use Case Completion Criteria
The Use Case phase is considered complete for V1 when:
•	Every major functional requirement maps to at least one Use Case.
•	Every important actor has defined interactions.
•	Main success flows are documented.
•	Important alternative flows are documented.
•	Security-sensitive operations include authorization checks.
•	Tenant-sensitive operations include tenant validation.
•	Business rules are referenced.
•	Order lifecycle transitions are explicitly defined.
•	Customer ordering is represented from website access through order creation.
•	Use Cases can be converted into User Stories and implementation tasks.
The Use Cases therefore provide the behavioral bridge between requirements and the domain/system design that follows.
07 — User Stories Specification
1. Document Purpose
This document translates the Restaurant SaaS Platform's Functional Requirements, Business Rules, and Use Cases into implementation-oriented User Stories.
A User Story describes a capability from the perspective of the person who needs it.
The standard format is:
As a [actor], I want [capability], so that [business value].
Each story includes:
•	Story ID
•	Actor
•	User Story
•	Priority
•	Acceptance Criteria
•	Related Use Cases
•	Related Business Rules
•	Dependencies
The User Stories will later be used to create:
•	Development tasks
•	API requirements
•	Angular features
•	Database requirements
•	Automated tests
•	Sprint planning
•	Definition of Done
________________________________________
2. Story Priority
Priority	Meaning
Must	Required for V1
Should	Important but not blocking core V1
Could	Optional enhancement
Future	Later product version
________________________________________
3. Authentication User Stories
US-AUTH-001 — User Registration
Actor: User
Priority: Must
User Story
As a user, I want to register an account so that I can access the platform.
Acceptance Criteria
•	User can submit required registration information.
•	Required fields are validated.
•	Duplicate identity is rejected.
•	Password requirements are enforced.
•	Password is securely stored.
•	Successful registration creates an account.
•	Sensitive registration data is not exposed in logs.
Related
•	UC-AUTH-001
•	BR-USER-001
•	BR-SEC-001
________________________________________
US-AUTH-002 — User Login
Actor: User
Priority: Must
User Story
As a user, I want to log in securely so that I can access functionality available to me.
Acceptance Criteria
•	Valid credentials authenticate successfully.
•	Invalid credentials are rejected.
•	Inactive users cannot access protected functionality.
•	User role is available to the authorization system.
•	Tenant membership is resolved where applicable.
•	Authentication failures do not expose sensitive information.
Related
•	UC-AUTH-002
•	BR-USER-002
•	BR-USER-003
•	BR-SEC-001
________________________________________
US-AUTH-003 — Logout
Actor: Authenticated User
Priority: Must
User Story
As an authenticated user, I want to log out so that my session is no longer active.
Acceptance Criteria
•	User can explicitly log out.
•	Client authentication state is cleared appropriately.
•	Protected UI is no longer accessible without authentication.
________________________________________
US-AUTH-004 — Password Reset
Actor: User
Priority: Must
User Story
As a user, I want to reset my forgotten password so that I can regain access to my account.
Acceptance Criteria
•	User can request password recovery.
•	Recovery mechanism does not reveal whether an account exists unnecessarily.
•	Reset token/process is time-limited.
•	New password satisfies password requirements.
•	Previous authentication state is handled appropriately.
________________________________________
4. Tenant User Stories
US-TENANT-001 — Create Tenant
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to create a restaurant tenant so that a restaurant can use the SaaS platform.
Acceptance Criteria
•	Administrator can enter tenant information.
•	Tenant identifier is generated.
•	Tenant slug must be unique.
•	Restaurant profile is created.
•	Initial tenant state is assigned.
•	Operation is recorded.
Related
•	UC-TENANT-001
•	BR-TENANT-001
•	BR-TENANT-002
•	BR-TENANT-003
________________________________________
US-TENANT-002 — Activate Tenant
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to activate a tenant so that the restaurant can use the platform.
Acceptance Criteria
•	Only authorized administrators can activate tenants.
•	Tenant state changes to Active.
•	Activation is recorded.
•	Active tenant can use permitted platform functionality.
________________________________________
US-TENANT-003 — Suspend Tenant
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to suspend a tenant so that access can be restricted when necessary.
Acceptance Criteria
•	Only authorized administrators can suspend tenants.
•	Suspended tenant cannot perform restricted operations.
•	Public ordering is disabled.
•	Historical tenant data remains preserved.
•	Suspension is recorded.
________________________________________
US-TENANT-004 — View Tenant Details
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to view tenant information so that I can manage the SaaS platform.
Acceptance Criteria
•	Administrator can search tenants.
•	Administrator can view tenant status.
•	Administrator can view restaurant information.
•	Tenant-specific information is displayed according to platform permissions.
________________________________________
5. Restaurant User Stories
US-REST-001 — Configure Restaurant Profile
Actor: Restaurant Owner
Priority: Must
User Story
As a Restaurant Owner, I want to configure my restaurant profile so that customers see accurate restaurant information.
Acceptance Criteria
•	Owner can update restaurant name.
•	Owner can update description.
•	Owner can update contact information.
•	Owner can update address.
•	Owner can upload a logo.
•	Changes are tenant-scoped.
•	Invalid data is rejected.
________________________________________
US-REST-002 — Configure Opening Hours
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to configure opening hours so that the system knows when the restaurant operates.
Acceptance Criteria
•	User can configure operating days.
•	User can configure opening time.
•	User can configure closing time.
•	Invalid time configurations are rejected.
•	Configuration belongs to the current tenant.
________________________________________
US-REST-003 — Change Restaurant Status
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to change the restaurant's operational status so that customers know whether ordering is available.
Acceptance Criteria
•	Authorized user can change restaurant status.
•	Status is tenant-specific.
•	Closed/unavailable state prevents normal order creation.
•	Customers can still access permitted public information.
________________________________________
6. Staff User Stories
US-STAFF-001 — View Staff
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to view my staff so that I can manage restaurant employees.
Acceptance Criteria
•	Staff list contains only current-tenant staff.
•	Staff role is displayed.
•	Staff status is displayed.
•	Unauthorized users cannot access the list.
________________________________________
US-STAFF-002 — Invite Staff
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to invite staff members so that they can work within my restaurant.
Acceptance Criteria
•	Authorized users can create staff invitations.
•	Staff member is associated with the current tenant.
•	Role must be selected from permitted roles.
•	User cannot assign unauthorized roles.
•	Invitation can be sent through the configured notification mechanism.
Related
•	UC-STAFF-002
•	BR-STAFF-001
•	BR-STAFF-002
•	BR-SEC-003
________________________________________
US-STAFF-003 — Change Staff Role
Actor: Restaurant Owner / Authorized Manager
Priority: Must
User Story
As a restaurant owner, I want to change a staff member's role so that their permissions match their responsibilities.
Acceptance Criteria
•	Only authorized users can change roles.
•	New role must be valid.
•	Staff must belong to the current tenant.
•	User cannot assign a role above their authority.
•	Updated authorization takes effect according to the authentication/token strategy.
________________________________________
US-STAFF-004 — Deactivate Staff
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to deactivate staff accounts so that former or inactive staff cannot access the restaurant system.
Acceptance Criteria
•	Authorized user can deactivate staff.
•	Deactivated staff cannot perform normal protected operations.
•	Historical records remain intact.
•	Deactivation is auditable.
________________________________________
7. Menu User Stories
US-MENU-001 — Create Category
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to create menu categories so that I can organize my menu.
Acceptance Criteria
•	Category requires a valid name.
•	Category belongs to current tenant.
•	Category can have a display order.
•	Unauthorized users cannot create categories.
________________________________________
US-MENU-002 — Update Category
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to update a category so that my menu remains accurate.
Acceptance Criteria
•	User can update permitted category information.
•	Category must belong to current tenant.
•	Invalid updates are rejected.
________________________________________
US-MENU-003 — Reorder Categories
Actor: Restaurant Owner / Manager
Priority: Should
User Story
As a restaurant manager, I want to reorder menu categories so that customers see them in the preferred order.
Acceptance Criteria
•	User can change category ordering.
•	Ordering applies only to the current tenant.
•	Public menu reflects the published/current ordering.
________________________________________
US-MENU-004 — Create Menu Item
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to create menu items so that customers can order food from my restaurant.
Acceptance Criteria
•	Item requires a valid name.
•	Item requires a valid category.
•	Item requires a valid price.
•	Item belongs to current tenant.
•	Item availability can be configured.
•	Optional image can be uploaded.
•	Unauthorized users cannot create items.
________________________________________
US-MENU-005 — Update Menu Item
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to update menu items so that product information and pricing remain accurate.
Acceptance Criteria
•	User can update permitted fields.
•	Item must belong to current tenant.
•	Price changes affect future orders.
•	Existing order prices remain unchanged.
•	Invalid prices are rejected.
________________________________________
US-MENU-006 — Change Item Availability
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to mark an item unavailable so that customers cannot order food that is currently unavailable.
Acceptance Criteria
•	Authorized user can change availability.
•	Unavailable items cannot be newly ordered.
•	Existing historical orders are unaffected.
•	Availability is tenant-scoped.
________________________________________
US-MENU-007 — Delete Menu Item
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to remove a menu item from active use so that customers no longer see/order it.
Acceptance Criteria
•	Historical orders remain valid.
•	Existing order items are not deleted.
•	Item is no longer available for new orders.
•	Deletion follows the system's soft-delete/historical-data policy.
________________________________________
8. Website User Stories
US-WEB-001 — Select Website Template
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to select a website template so that my restaurant has a suitable online appearance.
Acceptance Criteria
•	Available templates are displayed.
•	User can select an authorized template.
•	Template belongs to the platform template catalogue.
•	Selection is tenant-specific.
________________________________________
US-WEB-002 — Customize Website Theme
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to customize colors, fonts, and layout so that the website matches my restaurant branding.
Acceptance Criteria
•	Supported theme properties can be changed.
•	Invalid configuration is rejected.
•	Configuration is tenant-specific.
•	Changes can be previewed.
________________________________________
US-WEB-003 — Preview Website
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to preview my website before publishing it so that I can verify the design.
Acceptance Criteria
•	Preview reflects current draft configuration.
•	Preview does not unintentionally publish changes.
•	Preview is tenant-specific.
________________________________________
US-WEB-004 — Publish Website
Actor: Restaurant Owner / Authorized Manager
Priority: Must
User Story
As a restaurant owner, I want to publish my website so that customers can see the latest approved configuration.
Acceptance Criteria
•	User must be authorized.
•	Configuration must pass validation.
•	Published website uses published configuration.
•	Unpublished changes are not automatically exposed.
•	Publishing can be audited.
________________________________________
9. Public Website User Stories
US-PUBLIC-001 — Open Restaurant Website
Actor: Customer
Priority: Must
User Story
As a customer, I want to open a restaurant's website so that I can view its information and menu.
Acceptance Criteria
•	Restaurant can be resolved from its public identifier.
•	Correct tenant is resolved.
•	Published configuration is loaded.
•	Restaurant branding is displayed.
•	Inactive restaurants display an appropriate state.
________________________________________
US-PUBLIC-002 — Browse Menu
Actor: Customer
Priority: Must
User Story
As a customer, I want to browse the restaurant menu so that I can choose what to order.
Acceptance Criteria
•	Categories are displayed.
•	Available menu items are displayed.
•	Prices are displayed.
•	Unavailable items are not orderable.
•	Menu ordering is respected.
•	Data belongs to the selected restaurant.
________________________________________
US-PUBLIC-003 — View Menu Item
Actor: Customer
Priority: Must
User Story
As a customer, I want to view menu item details so that I can decide whether to order it.
Acceptance Criteria
•	Item name is displayed.
•	Description is displayed where available.
•	Current price is displayed.
•	Image is displayed where available.
•	Availability is shown correctly.
________________________________________
10. Cart User Stories
US-CART-001 — Add Item
Actor: Customer
Priority: Must
User Story
As a customer, I want to add menu items to my cart so that I can build an order.
Acceptance Criteria
•	Customer can add an available item.
•	Quantity must be positive.
•	Item belongs to the restaurant currently represented by the cart.
•	Cart quantity is updated correctly.
________________________________________
US-CART-002 — Update Quantity
Actor: Customer
Priority: Must
User Story
As a customer, I want to change item quantities so that I can adjust my order.
Acceptance Criteria
•	Quantity can be increased.
•	Quantity can be decreased.
•	Quantity cannot become negative.
•	Cart total updates accordingly.
________________________________________
US-CART-003 — Remove Item
Actor: Customer
Priority: Must
User Story
As a customer, I want to remove items from my cart so that I can change my order.
Acceptance Criteria
•	Selected item is removed.
•	Remaining items stay intact.
•	Cart total is recalculated.
________________________________________
US-CART-004 — Prevent Mixed-Restaurant Cart
Actor: Customer
Priority: Must
User Story
As a customer, I want the system to prevent items from different restaurants being combined into one order so that my order belongs to exactly one restaurant.
Acceptance Criteria
•	Cart is associated with one tenant.
•	Adding an item from another tenant is prevented.
•	User may be prompted to clear the existing cart before switching restaurants.
________________________________________
11. Checkout User Stories
US-CHECKOUT-001 — Enter Customer Information
Actor: Customer
Priority: Must
User Story
As a customer, I want to provide my required contact/order information so that the restaurant can process my order.
Acceptance Criteria
•	Required information is clearly identified.
•	Input is validated.
•	Invalid information prevents checkout.
•	Valid information is included in the order.
________________________________________
US-CHECKOUT-002 — Validate Cart Before Checkout
Actor: System
Priority: Must
User Story
As the system, I want to revalidate the cart before creating an order so that invalid or outdated cart information cannot create an incorrect order.
Acceptance Criteria
The backend verifies:
•	Restaurant status
•	Tenant ownership
•	Item existence
•	Item availability
•	Current server-side prices
•	Quantity
•	Applicable business rules
________________________________________
US-CHECKOUT-003 — Server-Side Price Calculation
Actor: System
Priority: Must
User Story
As the system, I want to calculate the authoritative order total on the server so that customers cannot manipulate prices.
Acceptance Criteria
•	Client-provided prices are not trusted.
•	Server retrieves authoritative menu prices.
•	Line totals are calculated server-side.
•	Order subtotal is calculated server-side.
•	Final total is calculated server-side.
________________________________________
US-CHECKOUT-004 — Create Order
Actor: Customer
Priority: Must
User Story
As a customer, I want to submit my checkout so that my order is sent to the restaurant.
Acceptance Criteria
•	Cart must contain at least one item.
•	Restaurant must accept orders.
•	All items must pass validation.
•	Order is persisted atomically.
•	Order number is generated.
•	Order status begins as New.
•	Customer receives confirmation.
________________________________________
12. Restaurant Order User Stories
US-ORDER-001 — View Orders
Actor: Restaurant Staff
Priority: Must
User Story
As restaurant staff, I want to view my restaurant's orders so that I can process customer requests.
Acceptance Criteria
•	Only authorized staff can access orders.
•	Only current-tenant orders are returned.
•	Orders are paginated.
•	Orders can be filtered by status.
•	Unauthorized cross-tenant access is prevented.
________________________________________
US-ORDER-002 — View Order Details
Actor: Restaurant Staff
Priority: Must
User Story
As restaurant staff, I want to view order details so that I know what the customer ordered.
Acceptance Criteria
•	Customer information is displayed according to authorization.
•	Order items are displayed.
•	Quantities are displayed.
•	Historical unit prices are displayed.
•	Order total is displayed.
•	Current status is displayed.
________________________________________
US-ORDER-003 — Confirm Order
Actor: Authorized Staff
Priority: Must
User Story
As authorized restaurant staff, I want to confirm a new order so that the restaurant acknowledges it.
Acceptance Criteria
•	Only New orders can be confirmed.
•	User must have appropriate permission.
•	Status changes to Confirmed.
•	Invalid transitions are rejected.
________________________________________
US-ORDER-004 — Start Preparing Order
Actor: Kitchen Staff
Priority: Must
User Story
As kitchen staff, I want to start preparing an order so that the restaurant knows the order is being prepared.
Acceptance Criteria
•	Only Confirmed orders can enter preparation.
•	Authorized kitchen staff can perform the action.
•	Status changes to Preparing.
________________________________________
US-ORDER-005 — Mark Order Ready
Actor: Kitchen Staff
Priority: Must
User Story
As kitchen staff, I want to mark an order ready so that other restaurant staff know the food is prepared.
Acceptance Criteria
•	Only Preparing orders can become Ready.
•	Authorized staff can perform the action.
•	Status changes to Ready.
•	Relevant staff can receive the update.
________________________________________
US-ORDER-006 — Complete Order
Actor: Authorized Staff
Priority: Must
User Story
As authorized restaurant staff, I want to complete an order so that the system records that the order has finished processing.
Acceptance Criteria
•	Only valid Ready orders can be completed.
•	User must have appropriate permission.
•	Status changes to Completed.
•	Historical order information remains preserved.
________________________________________
US-ORDER-007 — Cancel Order
Actor: Authorized Staff
Priority: Must
User Story
As authorized restaurant staff, I want to cancel an order when allowed so that invalid or unfulfillable orders can be closed correctly.
Acceptance Criteria
•	User must have cancellation permission.
•	Current order status must permit cancellation.
•	Status changes to Cancelled.
•	Order is not physically deleted.
•	Cancellation is recorded.
________________________________________
13. Real-Time Notification User Stories
US-REALTIME-001 — Receive New Order Notification
Actor: Restaurant Staff
Priority: Must
User Story
As restaurant staff, I want to receive new order notifications in real time so that I can react immediately.
Acceptance Criteria
•	New order is persisted first.
•	SignalR event is sent afterward.
•	Only authorized users of the restaurant receive the event.
•	Other tenants do not receive the event.
•	Reconnection is handled appropriately.
________________________________________
US-REALTIME-002 — Receive Order Status Update
Actor: Restaurant Staff
Priority: Should
User Story
As restaurant staff, I want order status updates to appear in real time so that the dashboard remains current.
Acceptance Criteria
•	Status changes generate appropriate events.
•	Events are tenant-specific.
•	UI updates without unnecessary full-page reloads.
________________________________________
14. QR User Stories
US-QR-001 — Generate Restaurant QR
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to generate a QR code for my restaurant so that customers can quickly access my menu.
Acceptance Criteria
•	QR points to the correct restaurant.
•	QR does not expose private data.
•	QR is associated with the correct tenant.
•	Unauthorized users cannot generate/manage another restaurant's QR.
________________________________________
US-QR-002 — Download QR
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to download my QR code so that I can print and place it in my restaurant.
Acceptance Criteria
•	Authorized user can download the QR.
•	QR resolves to the correct restaurant.
•	Generated file has an appropriate format and quality.
________________________________________
15. File User Stories
US-FILE-001 — Upload Restaurant Logo
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant owner, I want to upload my restaurant logo so that my website reflects my branding.
Acceptance Criteria
•	Supported image types are accepted.
•	Invalid file types are rejected.
•	File size limits are enforced.
•	File belongs to the current tenant.
•	Logo can be displayed on the public website.
________________________________________
US-FILE-002 — Upload Menu Image
Actor: Restaurant Owner / Manager
Priority: Must
User Story
As a restaurant manager, I want to upload menu item images so that customers can visually understand the food.
Acceptance Criteria
•	Valid image is accepted.
•	Invalid image is rejected.
•	File belongs to the correct tenant.
•	Image can be associated with a menu item.
________________________________________
16. Subscription User Stories
US-SUB-001 — View Subscription
Actor: Restaurant Owner
Priority: Must
User Story
As a restaurant owner, I want to view my subscription so that I know which plan and features are active.
Acceptance Criteria
•	Current plan is displayed.
•	Subscription status is displayed.
•	Applicable limits are displayed.
•	Information belongs to the current tenant.
________________________________________
US-SUB-002 — Enforce Feature Limits
Actor: System
Priority: Must
User Story
As the platform, I want to enforce subscription limits so that tenants cannot exceed the capabilities of their plan.
Acceptance Criteria
•	Limits are stored/configured per plan.
•	Backend enforces limits.
•	Frontend may display remaining capacity.
•	Client-side checks alone are insufficient.
________________________________________
17. Platform Administration Stories
US-ADMIN-001 — Manage Tenants
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to manage restaurant tenants so that I can operate the SaaS platform.
Acceptance Criteria
Administrator can, according to permissions:
•	View tenants
•	Create tenants
•	Activate tenants
•	Suspend/deactivate tenants
•	View tenant details
________________________________________
US-ADMIN-002 — Manage Platform Users
Actor: Platform Administrator
Priority: Must
User Story
As a Platform Administrator, I want to manage platform users so that platform-level access remains controlled.
Acceptance Criteria
•	Platform users can be viewed.
•	Authorized administrators can manage permitted users.
•	Platform roles are separate from restaurant roles.
•	Sensitive changes are audited.
________________________________________
18. Audit User Stories
US-AUDIT-001 — Record Sensitive Operations
Actor: System
Priority: Must
User Story
As the platform, I want to record sensitive operations so that important business and security actions can be investigated later.
Acceptance Criteria
Audit records may capture:
•	Actor
•	Tenant
•	Operation
•	Timestamp
•	Resource
•	Relevant action metadata
Sensitive credentials must not be stored in audit records.
________________________________________
US-AUDIT-002 — View Tenant Audit Information
Actor: Authorized Restaurant User
Priority: Should
User Story
As an authorized restaurant user, I want to view relevant audit information so that I can understand important changes within my restaurant.
Acceptance Criteria
•	Only authorized users can access audit information.
•	Only current-tenant audit records are returned.
•	Audit records cannot be casually modified.
________________________________________
19. Search and Filtering User Stories
US-SEARCH-001 — Filter Orders
Actor: Restaurant Staff
Priority: Must
User Story
As restaurant staff, I want to filter orders so that I can quickly find relevant orders.
Acceptance Criteria
Filtering may include:
•	Status
•	Date
•	Order number
•	Customer information where permitted
Results remain tenant-scoped.
________________________________________
US-SEARCH-002 — Search Menu
Actor: Restaurant Staff / Customer
Priority: Should
User Story
As a user, I want to search or filter menu items so that I can quickly find relevant food items.
Acceptance Criteria
•	Search is limited to the appropriate restaurant context.
•	Unavailable items are handled correctly.
•	Search does not expose another tenant's data.
________________________________________
20. Error Handling User Stories
US-ERROR-001 — Validation Feedback
Actor: User
Priority: Must
User Story
As a user, I want clear validation messages so that I understand what needs to be corrected.
Acceptance Criteria
•	Invalid fields are identified.
•	Messages are understandable.
•	Backend validation remains authoritative.
•	Frontend displays validation errors appropriately.
________________________________________
US-ERROR-002 — Unauthorized Access
Actor: User
Priority: Must
User Story
As the system, I want to reject unauthorized requests so that protected functionality cannot be accessed by unauthorized users.
Acceptance Criteria
•	Unauthenticated requests receive appropriate authentication failure.
•	Authenticated users without permission are denied.
•	Sensitive implementation details are not exposed.
________________________________________
US-ERROR-003 — Cross-Tenant Resource Protection
Actor: System
Priority: Must
User Story
As the system, I want to reject cross-tenant resource access so that restaurant data remains isolated.
Acceptance Criteria
Given:
User → Tenant A
Resource → Tenant B
the request must not return Tenant B's resource.
This must work even if the user manually changes:
•	URL IDs
•	Route parameters
•	Query parameters
•	Request bodies
________________________________________
21. User Story Dependencies
Major dependencies are:
Authentication
      ↓
Tenant Context
      ↓
Restaurant
      ↓
Staff / Authorization
      ↓
Menu
      ↓
Website
      ↓
Public Website
      ↓
Cart
      ↓
Checkout
      ↓
Order
      ↓
Real-Time Notification
Subscription functionality intersects the tenant lifecycle:
Tenant
  ↓
Subscription
  ↓
Feature Access
  ↓
Feature Limits
________________________________________
22. V1 User Story Prioritization
Must Have
Platform
•	Tenant creation
•	Tenant activation/deactivation
•	Platform administration
Authentication
•	Registration
•	Login
•	Logout
•	Password management
Restaurant
•	Restaurant profile
•	Opening hours
•	Restaurant status
Staff
•	Staff listing
•	Staff invitation
•	Role assignment
•	Staff deactivation
Menu
•	Categories
•	Menu items
•	Pricing
•	Availability
•	Ordering
•	Historical price preservation
Website
•	Template
•	Theme
•	Preview
•	Publish
Customer
•	Public restaurant website
•	Menu browsing
•	Cart
•	Checkout
•	Order creation
Orders
•	View orders
•	Confirm
•	Prepare
•	Ready
•	Complete
•	Cancel
Real-Time
•	New order notification
•	Tenant-specific SignalR events
QR
•	Generate
•	Download
Security
•	Authentication
•	Authorization
•	Tenant isolation
•	Server-side pricing
•	Input validation
________________________________________
23. Should Have
•	Advanced search
•	Advanced filtering
•	Health checks
•	Correlation IDs
•	Detailed audit UI
•	Advanced notification system
•	Subscription management UI
•	More advanced website customization
•	Optimistic concurrency
________________________________________
24. Could Have
•	Advanced analytics
•	Customer accounts
•	Saved orders
•	Promotions
•	Discounts
•	Loyalty
•	Reservations
•	Advanced restaurant themes
•	Custom domains
________________________________________
25. Future Stories
The following are deliberately excluded from V1:
•	Delivery management
•	Native mobile applications
•	Multi-branch restaurants
•	Advanced payment gateway integration
•	Inventory management
•	Accounting
•	Payroll
•	AI-powered recommendations
•	Advanced POS integration
These should be introduced as separate feature sets rather than silently expanding V1 scope.
________________________________________
26. Acceptance Criteria Principle
A User Story is not complete merely because the happy path works.
For tenant-sensitive functionality, acceptance criteria must include:
Happy Path
+
Validation
+
Authorization
+
Tenant Isolation
+
Failure Handling
+
Historical Data Protection
For example, "Update Menu Item" is incomplete if it works for Tenant A but allows Tenant A to update Tenant B's menu item.
________________________________________
27. Definition of Ready
A User Story is ready for development when:
1.	The actor is identified.
2.	The business goal is clear.
3.	Acceptance criteria are testable.
4.	Relevant business rules are known.
5.	Dependencies are identified.
6.	Authorization requirements are understood.
7.	Tenant scope is understood.
8.	Required UI/API behavior is sufficiently clear.
9.	Ambiguous business decisions have been resolved.
________________________________________
28. Definition of Done
A User Story is considered complete when:
1.	Backend implementation is complete.
2.	Frontend implementation is complete where applicable.
3.	Validation is implemented.
4.	Authorization is implemented.
5.	Tenant isolation is verified.
6.	Business rules are enforced.
7.	Error handling is implemented.
8.	Automated tests pass.
9.	Logging is implemented where required.
10.	No critical security issue remains.
11.	The feature works through the intended end-to-end workflow.
12.	Documentation is updated where necessary.
________________________________________
29. Traceability Example
The SDLC traceability chain now becomes:
Product Vision
      ↓
Functional Requirement
      ↓
Business Rule
      ↓
Use Case
      ↓
User Story
      ↓
Acceptance Criteria
      ↓
Development Task
      ↓
Implementation
      ↓
Test
Example:
FR-CHECKOUT-004
Server-Side Pricing
        ↓
BR-PRICE-001
Server Controls Price
        ↓
UC-CHECKOUT-001
Checkout
        ↓
US-CHECKOUT-003
Server-Side Price Calculation
        ↓
Acceptance Criteria
        ↓
Order Service
        ↓
Automated Tests
________________________________________
30. User Story Completion Criteria
The User Story phase is considered complete for V1 when:
•	Major Use Cases have been decomposed into implementable stories.
•	Each important story has testable acceptance criteria.
•	Tenant-sensitive stories explicitly include isolation requirements.
•	Security-sensitive stories include authorization requirements.
•	Critical business rules are linked to stories.
•	Stories have priorities.
•	Dependencies are identified.
•	V1 scope is distinguishable from future functionality.
The User Stories now provide an implementation-oriented representation of the product requirements.
Document 08 — Domain Model
1. Purpose
The Domain Model defines the core business concepts of the Restaurant SaaS Platform and how they interact.
It answers:
•	What are the important business entities?
•	What does each entity represent?
•	Who owns each entity?
•	What relationships exist between entities?
•	What rules must always remain true?
•	Which entities control business operations?
•	Which entities form Aggregate Roots?
•	Which concepts should be modeled as Value Objects?
•	Which concepts belong to the platform, tenant, or customer?
The Domain Model is a business model, not a database schema.
The exact tables, foreign keys, indexes, columns, and normalization decisions will be defined later in Document 09 — ERD.
________________________________________
2. Domain Overview
The platform contains several major business areas:
Platform
   │
   ├── Tenant
   │      │
   │      ├── Restaurant
   │      ├── Staff Memberships
   │      ├── Subscription
   │      ├── Menu
   │      │      ├── Categories
   │      │      └── Menu Items
   │      ├── Website
   │      ├── QR Code
   │      ├── Files
   │      ├── Orders
   │      └── Audit Logs
   │
   └── Platform Users

Customer
   │
   └── Places Orders
The fundamental boundary is:
Platform
    ↓
Tenant
    ↓
Restaurant Business Data
Every tenant-owned business object must belong to exactly one tenant in V1.
________________________________________
3. Core Domain Concepts
3.1 Tenant
Purpose
Tenant represents an independent restaurant organization using the SaaS platform.
In V1:
One Tenant = One Restaurant
The model should nevertheless avoid making this assumption so rigid that future multi-branch support becomes impossible.
Responsibilities
A Tenant:
•	identifies the restaurant's SaaS account
•	owns restaurant-specific business data
•	controls access to tenant resources
•	has a unique public identifier/slug
•	has a lifecycle/status
•	has a subscription
•	provides the security boundary for tenant-owned data
Important Attributes
Conceptually:
Tenant
 ├── Id
 ├── Name
 ├── Slug
 ├── Status
 ├── CreatedAt
 └── ...
Invariants
•	Tenant identifier must be unique.
•	Tenant slug must be unique.
•	Inactive/suspended tenants cannot perform normal tenant operations.
•	Tenant-owned resources cannot belong to another tenant.
•	A user cannot access tenant resources without valid tenant membership/authorization.
Ownership
Tenant is a major Aggregate Root.
________________________________________
4. Restaurant
Purpose
Restaurant represents the actual restaurant business operated by a tenant.
It contains business-facing information such as:
•	restaurant name
•	description
•	contact information
•	logo
•	opening hours
•	operational status
Relationship
Tenant
   │
   └── Restaurant
V1:
Tenant 1 ─── 1 Restaurant
Future:
Tenant 1 ─── * Restaurants/Branches
Responsibilities
Restaurant manages:
•	business identity
•	operational state
•	contact information
•	opening hours
•	customer-facing restaurant information
Invariants
•	Restaurant belongs to exactly one tenant.
•	Restaurant cannot be accessed by another tenant.
•	Inactive restaurants cannot normally accept new orders.
•	Public customers can only access an active/published restaurant experience.
________________________________________
5. User
Purpose
User represents an authenticated person using the SaaS platform.
Examples:
•	Platform Administrator
•	Restaurant Owner
•	Restaurant Manager
•	Kitchen Staff
•	Cashier
•	Waiter
Important Design Decision
User and Tenant are different concepts.
A user answers:
Who is this person?
Tenant answers:
Which organization does this person operate within?
Therefore:
User ≠ Tenant
A user may potentially belong to multiple tenants in a future version.
For V1, a normal restaurant staff member will generally belong to one tenant.
Identity Responsibility
Authentication-related concerns such as:
•	password
•	email authentication
•	login
•	password hashing
•	claims
belong primarily to the Identity/infrastructure side.
The business domain should not become tightly coupled to authentication implementation details.
________________________________________
6. Staff Membership
Purpose
StaffMembership represents the relationship between an authenticated user and a tenant.
This is an important domain concept because role and tenant membership are separate concerns.
Example:
User
  │
  └── StaffMembership
          │
          ├── Tenant
          └── Role
Example
Suppose:
User = Ahmed
Tenant = Pizza House
Role = Kitchen Staff
The membership represents:
Ahmed ── Kitchen Staff ── Pizza House
Responsibilities
Staff Membership determines:
•	which tenant the user belongs to
•	what role they have within that tenant
•	whether the membership is active
•	when access started/ended
Invariants
•	A membership must reference a valid user.
•	A membership must reference a valid tenant.
•	A user cannot have duplicate active memberships for the same tenant.
•	A deactivated membership cannot access tenant resources.
•	Role assignment must respect authorization rules.
Important Principle
Do not model authorization as:
User → Role
only.
The meaningful relationship is:
User + Tenant → Role
because the same user could theoretically have different roles in different tenants.
________________________________________
7. Role
Purpose
Role defines what category of operations a user can perform.
Initial roles:
PlatformAdmin
Owner
Manager
KitchenStaff
Cashier
Waiter
Role answers:
What can this user do?
Tenant answers:
Where can this user do it?
Authorization Model
User
   +
Tenant Membership
   +
Role
   ↓
Allowed Operations
Future Permission Model
Roles may map to permissions such as:
Menu.View
Menu.Create
Menu.Update
Menu.Delete

Order.View
Order.Update
Order.Cancel

Staff.View
Staff.Invite
Staff.Update
Staff.Deactivate
________________________________________
8. Permission
Purpose
Permission represents a fine-grained authorization capability.
A role may contain multiple permissions.
Example:
Manager
 ├── Menu.View
 ├── Menu.Create
 ├── Menu.Update
 ├── Order.View
 ├── Order.Update
 └── Staff.View
Domain Decision
The initial V1 system can operate primarily using roles while keeping the architecture extensible for permissions.
Permissions are therefore an authorization concept rather than a core transactional business entity.
________________________________________
9. Subscription
Purpose
Subscription represents the tenant's access to the SaaS service.
It determines whether the tenant can use platform functionality according to its subscription state and plan.
Relationship
Tenant
   │
   └── Subscription
          │
          └── SubscriptionPlan
Subscription States
Trial
Active
PastDue
Suspended
Cancelled
Expired
Responsibilities
Subscription determines:
•	current subscription state
•	associated plan
•	feature access
•	limits
•	subscription period
Invariants
•	Subscription belongs to a tenant.
•	Suspended/expired tenants may have restricted access.
•	Feature limits must be enforced server-side.
•	Subscription state must not be trusted from frontend input.
________________________________________
10. Subscription Plan
Purpose
SubscriptionPlan defines a SaaS offering.
Examples:
Free
Basic
Professional
Business
A plan can define:
•	number of menu items
•	number of staff
•	number of orders
•	available website templates
•	storage limits
•	advanced features
The exact plans are business decisions and can change independently from the domain structure.
________________________________________
11. Menu
Purpose
Menu represents the restaurant's customer-facing collection of food/products.
Conceptually:
Restaurant
    │
    └── Menu
          │
          ├── Category
          │      └── Menu Items
          │
          └── Category
                 └── Menu Items
Responsibilities
Menu controls:
•	menu organization
•	category structure
•	item visibility
•	ordering
•	customer-facing availability
Important Domain Rule
A menu item cannot belong to a category from another tenant.
________________________________________
12. Menu Category
Purpose
Category groups menu items.
Examples:
Pizza
Burgers
Drinks
Desserts
Deals
Responsibilities
•	category name
•	display order
•	availability/visibility
•	relationship to menu items
Invariants
•	Category belongs to one tenant.
•	Category belongs to the appropriate restaurant/menu context.
•	Category ordering is tenant-specific.
•	A category cannot contain items belonging to another tenant.
________________________________________
13. Menu Item
Purpose
MenuItem represents an individual product that customers can order.
Examples:
Chicken Burger
Large Pizza
French Fries
Coke
Chocolate Cake
Responsibilities
•	name
•	description
•	price
•	availability
•	display order
•	image
•	category association
Critical Business Rule
The current menu price can change.
However, changing the menu item price must not change the price stored on historical orders.
Therefore:
MenuItem.Price
and
OrderItem.UnitPrice
are separate business concepts.
Example:
Today:
Burger = Rs. 500

Customer orders:
OrderItem.UnitPrice = Rs. 500

Tomorrow:
Burger = Rs. 550

Old order:
OrderItem.UnitPrice = Rs. 500
This preserves historical financial accuracy.
________________________________________
14. Website
Purpose
Website represents the public-facing digital experience of a restaurant.
It connects:
Restaurant
   ↓
Website
   ↓
Template + Configuration
   ↓
Public Customer Website
Responsibilities
•	website identity
•	selected template
•	draft configuration
•	published configuration
•	theme settings
•	layout settings
•	publication state
Important Concept
The website has two conceptual states:
Draft
Published
Restaurant staff can modify draft configuration without immediately changing what customers see.
________________________________________
15. Website Template
Purpose
WebsiteTemplate defines a reusable design structure.
Examples:
Modern Restaurant
Pizza Style
Minimal Cafe
Fast Food
Luxury Restaurant
A template should define the available layout/design structure.
It should not contain restaurant-specific business data.
Therefore:
Template
    ↓
Reusable Design

Restaurant Website
    ↓
Uses Template
    +
Restaurant Configuration
________________________________________
16. Website Configuration
Purpose
WebsiteConfiguration contains tenant-specific customization.
Examples:
Primary Color
Secondary Color
Font
Hero Section
Banner
Layout
Logo
Featured Categories
Important Rule
Configuration is restaurant-specific.
Template is reusable.
Therefore:
Template ≠ Configuration
A restaurant can use:
Template A
+
Its own configuration
without modifying Template A globally.
________________________________________
17. Customer
Purpose
Customer represents the person placing an order.
In V1, customers are guest customers.
They do not need a platform account.
Customer information may include:
Name
Phone
Email
Address
depending on the checkout requirements.
Important Distinction
Customer is different from authenticated SaaS User.
User
→ Restaurant staff / platform operator

Customer
→ Person ordering food
A customer does not automatically receive administrative access to the restaurant.
________________________________________
18. Cart
Purpose
Cart represents the customer's current intended purchase before checkout.
Responsibilities
•	identify restaurant/tenant
•	contain selected items
•	maintain quantities
•	calculate current cart state
Critical Invariant
A cart cannot contain items from multiple restaurants.
Therefore:
Cart
   ↓
Tenant A
   ├── Burger
   ├── Fries
   └── Coke
is valid.
But:
Cart
   ├── Pizza from Tenant A
   └── Burger from Tenant B
is invalid.
Important Principle
Tenant isolation applies to carts even though customers are unauthenticated.
________________________________________
19. Cart Item
Purpose
CartItem represents a menu item selected by the customer.
It contains conceptually:
MenuItem
Quantity
The cart is temporary.
Once checkout occurs, the system creates an independent order snapshot.
________________________________________
20. Order
Purpose
Order represents a confirmed customer purchase request.
It is one of the most important transactional entities in the system.
Aggregate Root
Order is an Aggregate Root.
The Order controls its:
•	items
•	total
•	status
•	customer information
•	lifecycle
Order Lifecycle
New
  ↓
Confirmed
  ↓
Preparing
  ↓
Ready
  ↓
Completed
Cancellation may occur according to business rules:
New → Cancelled
Confirmed → Cancelled
Exact allowed transitions will be defined by the Business Rules and later implemented in domain logic.
________________________________________
21. Order Item
Purpose
OrderItem represents a snapshot of what was purchased.
It should contain historical information such as:
Product/Menu Item reference
Product name
Quantity
Unit price
Line total
Critical Principle
An OrderItem must preserve the price at the time of purchase.
Therefore:
MenuItem
Current Price = 550
does not affect:
Old OrderItem
Unit Price = 500
This makes the order historically reliable.
________________________________________
22. Order Status
Order status represents the current state of an order.
Initial state model:
New
Confirmed
Preparing
Ready
Completed
Cancelled
State Transition Model
                ┌─────────────┐
                │     New     │
                └──────┬──────┘
                       │ Confirm
                       ▼
                ┌─────────────┐
                │  Confirmed  │
                └──────┬──────┘
                       │ Start Preparing
                       ▼
                ┌─────────────┐
                │  Preparing  │
                └──────┬──────┘
                       │ Mark Ready
                       ▼
                ┌─────────────┐
                │    Ready    │
                └──────┬──────┘
                       │ Complete
                       ▼
                ┌─────────────┐
                │  Completed  │
                └─────────────┘

New / Confirmed
       │
       │ Cancel
       ▼
   Cancelled
The domain must prevent invalid transitions such as:
Completed → Preparing
unless a future business rule explicitly permits it.
________________________________________
23. Order Status History
Purpose
OrderStatusHistory records important order state transitions.
Example:
New
↓
Confirmed
↓
Preparing
↓
Ready
↓
Completed
History can record:
•	previous status
•	new status
•	timestamp
•	actor
•	optional reason
This provides operational traceability.
________________________________________
24. Notification
Purpose
Notification represents a communication generated by the platform.
Examples:
New Order
Order Confirmed
Order Ready
Staff Invitation
Password Reset
Notifications may be delivered through:
SignalR
Email
Future SMS/Push
The notification domain concept should remain independent of the specific delivery technology.
________________________________________
25. File
Purpose
File represents a restaurant-owned uploaded asset.
Examples:
Restaurant Logo
Menu Item Image
Website Banner
Invariants
•	File belongs to the appropriate tenant.
•	Tenant A cannot access Tenant B's private files.
•	File type and size must be validated.
•	Public/private accessibility must be controlled.
The actual storage mechanism may be:
Local Storage
Azure Blob Storage
Amazon S3
Other Object Storage
without changing the core business concept.
________________________________________
26. QR Code
Purpose
QRCode represents a restaurant-specific mechanism for accessing the public restaurant website/menu.
Example:
QR Code
    ↓
Restaurant Public URL
    ↓
Restaurant Website
Important Security Rule
A QR code provides public customer access only.
It must never provide:
Admin access
Staff access
Authentication credentials
Private API access
________________________________________
27. Audit Log
Purpose
AuditLog records security-sensitive or business-critical operations.
Examples:
Tenant Created
Staff Invited
Role Changed
Menu Item Deleted
Order Cancelled
Restaurant Suspended
Subscription Changed
Responsibilities
Audit information may include:
•	actor
•	tenant
•	action
•	resource
•	timestamp
•	relevant metadata
Invariant
Tenant users must only be able to view audit information belonging to their authorized tenant.
Platform administrators may have broader platform-level visibility.
________________________________________
28. Domain Relationships
The major relationships are:
Tenant
 │
 ├── Restaurant
 │
 ├── StaffMembership
 │       └── User
 │
 ├── Subscription
 │       └── SubscriptionPlan
 │
 ├── Menu
 │     └── Category
 │            └── MenuItem
 │
 ├── Website
 │     ├── WebsiteTemplate
 │     └── WebsiteConfiguration
 │
 ├── QRCode
 │
 ├── Files
 │
 ├── Orders
 │     ├── OrderItem
 │     └── OrderStatusHistory
 │
 ├── Notifications
 │
 └── AuditLogs
Customer interaction:
Customer
   │
   └── Cart
        └── CartItems
              │
              └── MenuItems

Customer
   │
   └── Order
        └── OrderItems
              │
              └── MenuItems
________________________________________
29. Aggregate Roots
Aggregate Roots define the main boundaries through which domain operations should be performed.
Initial conceptual aggregate roots:
Aggregate Root	Main Responsibility
Tenant	Tenant identity and tenant lifecycle
Restaurant	Restaurant business configuration
Menu	Menu organization
Website	Website configuration/publication
Order	Customer purchase and order lifecycle
Subscription	Tenant SaaS subscription
StaffMembership	Tenant-user relationship
Not every database table should become an Aggregate Root.
For example:
Order
 ├── OrderItem
 └── OrderStatusHistory
should generally be treated as one transactional aggregate.
An external operation should not arbitrarily modify an OrderItem independently of its Order.
________________________________________
30. Value Objects
Some concepts are better represented as Value Objects rather than independent business entities.
Potential Value Objects include:
Money
Address
PhoneNumber
EmailAddress
OpeningHours
ColorConfiguration
ThemeConfiguration
For example:
Money
 ├── Amount
 └── Currency
Instead of treating money as a primitive number everywhere.
The final implementation decision will depend on the selected domain architecture and persistence strategy.
________________________________________
31. Tenant Ownership Model
Tenant ownership must be explicit.
The general rule is:
Tenant
   ↓
Owns
   ↓
Business Resource
Examples:
Tenant A → Menu A
Tenant A → Orders A
Tenant A → Website A

Tenant B → Menu B
Tenant B → Orders B
Tenant B → Website B
The system must never allow:
Tenant A User
      ↓
Tenant B Order
unless the user has explicit authorized cross-tenant platform privileges.
________________________________________
32. Domain Invariants
The following invariants are considered fundamental.
Tenant
Tenant slug must be unique.
Tenant data must remain isolated.
Staff
Staff membership must belong to a tenant.
Inactive membership cannot operate within the tenant.
Menu
Category and MenuItem must belong to the correct tenant.
MenuItem must reference a valid category.
Website
Only valid tenant configuration can be published.
Public customers see published configuration.
Cart
Cart cannot contain items from multiple tenants/restaurants.
Checkout
Client-provided prices are never trusted.
Current server-side prices must be validated.
Unavailable items cannot normally be ordered.
Order
Order belongs to one tenant.
OrderItems belong to their Order.
Historical prices cannot change.
Invalid status transitions are rejected.
QR
QR codes only expose public restaurant access.
Files
Tenant-owned files cannot be accessed across tenant boundaries.
________________________________________
33. Domain Lifecycle
#	Table	Purpose	Why We Use It
1	AspNetUsers	Stores authenticated user accounts	ASP.NET Core Identity manages login, password, email, security, and account lifecycle
2	AspNetRoles	Stores application roles	Defines roles such as PlatformAdmin, Owner, Manager, Kitchen, Cashier, Waiter
3	AspNetUserRoles	Links users to Identity roles	Standard ASP.NET Identity many-to-many user/role relationship
4	AspNetUserClaims	Stores claims assigned directly to users	Supports user-specific authorization/security claims
5	AspNetRoleClaims	Stores claims/permissions associated with roles	Allows role-based permissions without hard-coding every permission
6	AspNetUserLogins	Stores external login provider information	Supports Google/Microsoft or other external authentication providers
7	AspNetUserTokens	Stores Identity authentication tokens	Required by ASP.NET Identity for token-based features such as password reset and external authentication
8	Tenants	Represents an independent SaaS customer/organization	Provides the primary multi-tenancy boundary; every restaurant operates inside a tenant
9	StaffMemberships	Associates users with a tenant and their tenant-level role	A user can belong to a restaurant/tenant without making the Identity user itself tenant-specific
10	Restaurants	Stores restaurant/business information	Represents the actual restaurant owned/operated by a tenant
11	RestaurantAssets	Associates visual/media assets with restaurants	Stores references to logos, favicons, banners, cover images, etc. without adding many asset columns to Restaurants
12	SubscriptionPlans	Defines SaaS subscription plans	Stores available plans, pricing, limits, and feature definitions
13	Subscriptions	Stores a tenant's subscription history/current subscription	Tracks which plan a tenant uses and its subscription lifecycle
14	Menus	Represents a restaurant menu	Keeps menu as an independent domain object and allows future multiple menus/branches
15	MenuCategories	Groups menu items into categories	Organizes items such as Burgers, Pizza, Drinks, Desserts, etc.
16	MenuItems	Stores individual food/menu products	Represents what customers can actually order
17	WebsiteTemplates	Stores available website design templates	Allows restaurants to choose predefined website designs
18	Websites	Represents a restaurant's public website configuration/identity	Separates the website itself from the restaurant's core business data and supports future multiple websites/branches
19	WebsiteConfigurations	Stores customizable website settings	Handles branding, colors, layout, sections, content and other flexible website configuration
20	Customers	Stores customer information for restaurant interactions/orders	Allows restaurants to retain customer information without making every customer an ASP.NET Identity account
21	Carts	Represents a customer's current shopping cart	Maintains temporary/pre-order item selections before checkout
22	CartItems	Stores items inside a cart	Represents the products and quantities selected by a customer
23	Orders	Stores confirmed customer orders	The central transactional record connecting customer purchase, restaurant, pricing and order lifecycle
24	OrderItems	Stores individual items belonging to an order	Preserves the exact items, quantities and historical prices at the time of purchase
25	OrderStatusHistories	Records order status changes over time	Provides an audit trail of the order lifecycle such as New → Confirmed → Preparing → Ready → Completed
26	Notifications	Stores application notifications/events intended for users	Provides persistent notification history while real-time delivery can be handled separately through SignalR
27	Files	Central file/asset metadata repository	Provides a reusable abstraction for uploaded images and other stored files
28	QRCodes	Represents QR codes generated for restaurant access	Allows restaurants to generate/manage QR codes pointing customers to their public menu/website
29	AuditLogs	Records important system/user actions	Provides accountability, troubleshooting, security investigation, and compliance history

