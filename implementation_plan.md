# Smart Pill Box and Medication Management System

This document outlines the implementation plan for building a complete, modern, responsive web application for an IoT-based Smart Pill Box system. The application will be built using Next.js 15+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Recharts.

## User Review Required

> [!IMPORTANT]
> Please review the proposed architecture and stages. This is a very large application, so we will build it iteratively. Once you approve this plan, I will initialize the Next.js project and begin Stage 1.

## Open Questions

> [!WARNING]
> Before we begin creating the database schema, I need to know:
> 1. Do you already have a Supabase project set up, or should I provide the SQL migrations for you to run in a new project?
> 2. Will we need to test the ESP32 APIs with physical devices during development, or can we mock the hardware calls for now?
> 3. Do you have a Telegram Bot Token ready for the notification integrations?

## Proposed Changes

We will build the project in 10 logical stages as requested.

### Stage 1: Initial Setup & Dashboard UI
- Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
- Set up shadcn/ui and configure the theme (modern healthcare/IoT style).
- Create the sidebar navigation and base dashboard layout.
- Implement the authentication UI pages (`/login`).
- Implement the static Dashboard UI with summary cards and recent alerts placeholders.

### Stage 2: Supabase Database + CRUD
- Set up Supabase client.
- Create database migrations for all tables: `users`, `caregivers`, `patients`, `pill_boxes`, `compartments`, `medicines`, `schedules`, `dose_records`, `medicine_refills`, `device_events`, `notifications`.
- Set up Row Level Security (RLS) policies.

### Stage 3: Core Entities Management (Patients, Caregivers, Boxes)
- Implement `/patients` list and `/patients/[id]` detail view.
- Implement `/caregivers` management.
- Implement `/boxes` and `/boxes/[id]` views for pill box management.
- Create forms for adding, editing, and deleting these entities.

### Stage 4: Medicines & Schedules
- Implement `/medicines` page with inventory tracking.
- Implement `/schedules` page to assign medicines to boxes and specific time windows.
- Create the complex form for scheduling.

### Stage 5: ESP32 REST APIs
- Create backend endpoints (`/api/esp32/schedule`, `/api/esp32/events`, `/api/esp32/heartbeat`).
- Implement device authentication using `deviceApiKey`.
- Support different sensor logic (Box 1 vs Box 2 configuration).

### Stage 6: Dose Tracking
- Process incoming `MEDICINE_TAKEN` events from ESP32.
- Update `dose_records` (PENDING to TAKEN).
- Decrease medicine stock.
- Handle duplicates and out-of-window intake logic.

### Stage 7: Missed-Dose Detection
- Implement a chron/background job or check-on-read mechanism to identify missed doses when the time window passes.
- Generate `DOSE_MISSED` notifications.

### Stage 8: Real-time Monitoring
- Implement the `/monitoring` page.
- Integrate Supabase Realtime channels to push events (e.g., Medicine Taken) to the caregiver dashboard instantly.

### Stage 9: Telegram Notifications
- Integrate Telegram bot API.
- Send alerts for doses taken, missed doses, low stock, and offline devices.

### Stage 10: Reports, Adherence & Final Polish
- Implement the `/history` page with filters and search.
- Implement `/reports` page with Recharts for daily/weekly/monthly adherence.
- Final UI polish, loading states, error handling, empty states, and responsive design checks.

## Verification Plan

### Automated Tests
- N/A for this stage.

### Manual Verification
- Deploying the app locally and navigating through all pages.
- Simulating ESP32 HTTP POST requests via a REST client to verify the backend logic (dose tracking, status changes, alerts).
- Validating real-time updates across multiple browser windows.
