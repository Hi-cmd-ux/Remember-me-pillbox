export type DoseStatus = 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'SNOOZED';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'MAINTENANCE';
export type CompartmentStatus = 'READY' | 'OPEN' | 'EMPTY' | 'REFILL_NEEDED' | 'DISPENSED';
export type EventType = 'MEDICINE_TAKEN' | 'DOSE_MISSED' | 'BOX_OPENED' | 'IR_TRIGGERED' | 'BUTTON_PRESSED' | 'DEVICE_HEARTBEAT' | 'LOW_STOCK' | 'HARDWARE_FAULT';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'CARE_GIVER' | 'PATIENT' | 'ADMIN';
  token?: string;
}

export interface Patient {
  id: string;
  name: string;
  avatar?: string;
  age: number;
  gender: string;
  roomNumber: string;
  caregiverId?: string;
  pillBoxId?: string;
  medicalConditions: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  complianceRate: number;
  createdAt: string;
}

export interface Caregiver {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  role: 'PRIMARY' | 'FAMILY' | 'NURSE' | 'DOCTOR';
  telegramChatId?: string;
  notifyTelegram: boolean;
  notifyEmail: boolean;
  assignedPatientIds: string[];
}

export interface Compartment {
  id: number;
  label: string;
  medicineId?: string;
  medicineName?: string;
  dosage: string;
  currentPillCount: number;
  maxCapacity: number;
  status: CompartmentStatus;
  ledColor: string;
}

export interface PillBox {
  id: string;
  name: string;
  model: 'BOX_1_SERVO_WEIGHT' | 'BOX_2_MODULAR_IR_RFID';
  patientId?: string;
  patientName?: string;
  deviceApiKey: string;
  status: DeviceStatus;
  batteryPercentage: number;
  rssiSignal: number;
  lastHeartbeat: string;
  firmwareVersion: string;
  ipAddress: string;
  compartments: Compartment[];
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  dosageForm: string;
  strength: string;
  totalStock: number;
  minThreshold: number;
  colorHex: string;
  shape: string;
  instructions: string;
  refillNeeded: boolean;
}

export interface Schedule {
  id: string;
  patientId: string;
  patientName: string;
  pillBoxId: string;
  compartmentId: number;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  timeWindowMinutes: number;
  repeatDays: string[];
  isActive: boolean;
}

export interface DoseRecord {
  id: string;
  scheduleId: string;
  patientId: string;
  patientName: string;
  medicineId: string;
  medicineName: string;
  pillBoxId: string;
  compartmentId: number;
  scheduledDate: string;
  scheduledTime: string;
  takenAt?: string;
  status: DoseStatus;
  dispensedBySensor: boolean;
  notes?: string;
}

export interface DeviceEvent {
  id: string;
  pillBoxId: string;
  pillBoxName: string;
  eventType: EventType;
  compartmentId?: number;
  details: string;
  timestamp: string;
  rawPayload?: Record<string, unknown>;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
}

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  type: 'DOSE_TAKEN' | 'DOSE_MISSED' | 'LOW_STOCK' | 'DEVICE_OFFLINE' | 'HARDWARE_ALERT';
  patientId?: string;
  patientName?: string;
  timestamp: string;
  isRead: boolean;
  sentToTelegram: boolean;
}

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  enabled: boolean;
  notifyOnTaken: boolean;
  notifyOnMissed: boolean;
  notifyOnLowStock: boolean;
  notifyOnOffline: boolean;
}
