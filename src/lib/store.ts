import { 
  Patient, Caregiver, PillBox, Medicine, Schedule, 
  DoseRecord, DeviceEvent, NotificationAlert, TelegramConfig, UserSession
} from './types';

const INITIAL_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  defaultChatId: '',
  enabled: false,
  notifyOnTaken: true,
  notifyOnMissed: true,
  notifyOnLowStock: true,
  notifyOnOffline: true
};

class SmartPillBoxStore {
  private session: UserSession | null = null;
  private patients: Patient[] = [];
  private caregivers: Caregiver[] = [];
  private medicines: Medicine[] = [];
  private boxes: PillBox[] = [];
  private schedules: Schedule[] = [];
  private doses: DoseRecord[] = [];
  private events: DeviceEvent[] = [];
  private notifications: NotificationAlert[] = [];
  private telegramConfig: TelegramConfig = INITIAL_TELEGRAM_CONFIG;
  private listeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      if (this.session) {
        localStorage.setItem('spb_user_session', JSON.stringify(this.session));
      } else {
        localStorage.removeItem('spb_user_session');
      }
      localStorage.setItem('spb_patients', JSON.stringify(this.patients));
      localStorage.setItem('spb_caregivers', JSON.stringify(this.caregivers));
      localStorage.setItem('spb_medicines', JSON.stringify(this.medicines));
      localStorage.setItem('spb_boxes', JSON.stringify(this.boxes));
      localStorage.setItem('spb_schedules', JSON.stringify(this.schedules));
      localStorage.setItem('spb_doses', JSON.stringify(this.doses));
      localStorage.setItem('spb_events', JSON.stringify(this.events));
      localStorage.setItem('spb_notifications', JSON.stringify(this.notifications));
      localStorage.setItem('spb_telegram', JSON.stringify(this.telegramConfig));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  private loadFromLocalStorage() {
    try {
      const u = localStorage.getItem('spb_user_session');
      if (u) this.session = JSON.parse(u);
      const p = localStorage.getItem('spb_patients');
      if (p) this.patients = JSON.parse(p);
      const c = localStorage.getItem('spb_caregivers');
      if (c) this.caregivers = JSON.parse(c);
      const m = localStorage.getItem('spb_medicines');
      if (m) this.medicines = JSON.parse(m);
      const b = localStorage.getItem('spb_boxes');
      if (b) this.boxes = JSON.parse(b);
      const s = localStorage.getItem('spb_schedules');
      if (s) this.schedules = JSON.parse(s);
      const d = localStorage.getItem('spb_doses');
      if (d) this.doses = JSON.parse(d);
      const e = localStorage.getItem('spb_events');
      if (e) this.events = JSON.parse(e);
      const n = localStorage.getItem('spb_notifications');
      if (n) this.notifications = JSON.parse(n);
      const t = localStorage.getItem('spb_telegram');
      if (t) this.telegramConfig = JSON.parse(t);

      if (
        this.session?.role === 'CARE_GIVER' &&
        !this.caregivers.some(caregiver => caregiver.email.toLowerCase() === this.session?.email.toLowerCase())
      ) {
        this.caregivers.unshift({
          id: `cg-${Date.now()}`,
          name: this.session.name,
          email: this.session.email,
          phone: '',
          role: 'NURSE',
          notifyTelegram: true,
          notifyEmail: true,
          assignedPatientIds: []
        });
        localStorage.setItem('spb_caregivers', JSON.stringify(this.caregivers));
      }
    } catch (e) {
      console.warn('Failed to load from local storage:', e);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(l => l());
  }

  // Authentication Methods
  public getUserSession() {
    return this.session;
  }

  public login(email: string, role: UserSession['role'] = 'CARE_GIVER', name?: string) {
    this.session = {
      id: `usr-${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      role
    };
    this.ensureCurrentCaregiver();
    this.notify();
    return this.session;
  }

  public logout() {
    this.session = null;
    this.notify();
  }

  // Getters
  public getPatients() { return this.patients; }
  public getCaregivers() {
    this.ensureCurrentCaregiver();
    return this.caregivers;
  }
  public getMedicines() { return this.medicines; }
  public getBoxes() { return this.boxes; }
  public getSchedules() { return this.schedules; }
  public getDoses() { return this.doses; }
  public getEvents() { return this.events; }
  public getNotifications() { return this.notifications; }
  public getTelegramConfig() { return this.telegramConfig; }

  private ensureCurrentCaregiver() {
    if (
      this.session?.role !== 'CARE_GIVER' ||
      this.caregivers.some(caregiver => caregiver.email.toLowerCase() === this.session?.email.toLowerCase())
    ) {
      return;
    }

    this.caregivers.unshift({
      id: `cg-${Date.now()}`,
      name: this.session.name,
      email: this.session.email,
      phone: '',
      role: 'NURSE',
      notifyTelegram: true,
      notifyEmail: true,
      assignedPatientIds: []
    });
    this.saveToLocalStorage();
  }

  public getBoxByApiKey(apiKey: string) {
    return this.boxes.find(b => b.deviceApiKey === apiKey);
  }

  public getBoxById(id: string) {
    return this.boxes.find(b => b.id === id);
  }

  public getPatientById(id: string) {
    return this.patients.find(p => p.id === id);
  }

  // Mutators & Operations
  public updateTelegramConfig(config: Partial<TelegramConfig>) {
    this.telegramConfig = { ...this.telegramConfig, ...config };
    this.notify();
  }

  public markNotificationAsRead(id: string) {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.notify();
  }

  public clearAllNotifications() {
    this.notifications = [];
    this.notify();
  }

  public updateHeartbeat(apiKey: string, battery: number, rssi: number, firmware?: string) {
    const boxIndex = this.boxes.findIndex(b => b.deviceApiKey === apiKey);
    if (boxIndex >= 0) {
      this.boxes[boxIndex] = {
        ...this.boxes[boxIndex],
        batteryPercentage: battery,
        rssiSignal: rssi,
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        firmwareVersion: firmware || this.boxes[boxIndex].firmwareVersion
      };
      this.notify();
    }
  }

  public recordDoseTaken(pillBoxId: string, compartmentId: number, notes?: string) {
    const box = this.boxes.find(b => b.id === pillBoxId);
    if (!box) return { success: false, message: 'Box not found' };

    const comp = box.compartments.find(c => c.id === compartmentId);
    if (comp && comp.currentPillCount > 0) {
      comp.currentPillCount -= 1;
      if (comp.currentPillCount <= 3) {
        comp.status = 'REFILL_NEEDED';
      }
    }

    if (comp && comp.medicineId) {
      const med = this.medicines.find(m => m.id === comp.medicineId);
      if (med) {
        med.totalStock = Math.max(0, med.totalStock - 1);
        if (med.totalStock <= med.minThreshold) {
          med.refillNeeded = true;
          this.createNotification({
            title: 'Low Medicine Stock',
            message: `${med.name} stock has dropped to ${med.totalStock} units.`,
            type: 'LOW_STOCK',
            patientId: box.patientId,
            patientName: box.patientName
          });
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const pendingDose = this.doses.find(
      d => d.pillBoxId === pillBoxId && d.compartmentId === compartmentId && d.status === 'PENDING'
    );
    const nowIso = new Date().toISOString();

    if (pendingDose) {
      pendingDose.status = 'TAKEN';
      pendingDose.takenAt = nowIso;
      pendingDose.dispensedBySensor = true;
      pendingDose.notes = notes || 'Recorded via hardware sensor';
    } else {
      this.doses.unshift({
        id: `dose-${Date.now()}`,
        scheduleId: 'unscheduled',
        patientId: box.patientId || 'unknown',
        patientName: box.patientName || 'Patient',
        medicineId: comp?.medicineId || 'unknown',
        medicineName: comp?.medicineName || 'Medication',
        pillBoxId: box.id,
        compartmentId,
        scheduledDate: todayStr,
        scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        takenAt: nowIso,
        status: 'TAKEN',
        dispensedBySensor: true,
        notes: notes || 'Dose taken outside scheduled window'
      });
    }

    this.events.unshift({
      id: `evt-${Date.now()}`,
      pillBoxId: box.id,
      pillBoxName: box.name,
      eventType: 'MEDICINE_TAKEN',
      compartmentId,
      details: `${box.patientName || 'Patient'} took dose from Compartment ${compartmentId}`,
      timestamp: nowIso,
      severity: 'SUCCESS'
    });

    this.createNotification({
      title: 'Medicine Taken',
      message: `${box.patientName || 'Patient'} took ${comp?.medicineName || 'dose'} from Compartment ${compartmentId}`,
      type: 'DOSE_TAKEN',
      patientId: box.patientId,
      patientName: box.patientName
    });

    this.notify();
    return { success: true, message: 'Dose logged successfully' };
  }

  public recordMissedDose(doseId: string) {
    const dose = this.doses.find(d => d.id === doseId);
    if (dose && dose.status === 'PENDING') {
      dose.status = 'MISSED';
      const box = this.boxes.find(b => b.id === dose.pillBoxId);

      this.events.unshift({
        id: `evt-${Date.now()}`,
        pillBoxId: dose.pillBoxId,
        pillBoxName: box?.name || 'Smart Pill Box',
        eventType: 'DOSE_MISSED',
        compartmentId: dose.compartmentId,
        details: `MISSED DOSE ALERT: ${dose.patientName} missed dose of ${dose.medicineName} at ${dose.scheduledTime}`,
        timestamp: new Date().toISOString(),
        severity: 'ALERT'
      });

      this.createNotification({
        title: 'MISSED DOSE ALERT!',
        message: `${dose.patientName} missed dose of ${dose.medicineName} at ${dose.scheduledTime}`,
        type: 'DOSE_MISSED',
        patientId: dose.patientId,
        patientName: dose.patientName
      });

      this.notify();
    }
  }

  public checkAndTriggerMissedDoses() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let triggeredCount = 0;
    this.doses.forEach(dose => {
      if (dose.status === 'PENDING' && dose.scheduledDate === todayStr) {
        const [hours, mins] = dose.scheduledTime.split(':').map(Number);
        const scheduledMinutes = hours * 60 + mins;
        if (currentMinutes > scheduledMinutes + 30) {
          this.recordMissedDose(dose.id);
          triggeredCount++;
        }
      }
    });

    return triggeredCount;
  }

  public createNotification(n: Omit<NotificationAlert, 'id' | 'timestamp' | 'isRead' | 'sentToTelegram'>) {
    const notif: NotificationAlert = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      sentToTelegram: this.telegramConfig.enabled
    };
    this.notifications.unshift(notif);
    this.notify();
  }

  public addPatient(patient: Omit<Patient, 'id' | 'createdAt'>) {
    const newPat: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.patients.unshift(newPat);
    this.notify();
    return newPat;
  }

  public addCaregiver(cg: Omit<Caregiver, 'id'>) {
    const newCg: Caregiver = {
      ...cg,
      id: `cg-${Date.now()}`
    };
    this.caregivers.unshift(newCg);
    this.notify();
    return newCg;
  }

  public addPillBox(box: Omit<PillBox, 'id' | 'lastHeartbeat'>) {
    const newBox: PillBox = {
      ...box,
      id: `box-${Date.now()}`,
      lastHeartbeat: new Date().toISOString()
    };
    this.boxes.unshift(newBox);
    this.notify();
    return newBox;
  }

  public addMedicine(medicine: Omit<Medicine, 'id' | 'refillNeeded'>) {
    const newMed: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      refillNeeded: medicine.totalStock <= medicine.minThreshold
    };
    this.medicines.unshift(newMed);
    this.notify();
    return newMed;
  }

  public refillMedicine(id: string, amount: number) {
    const med = this.medicines.find(m => m.id === id);
    if (med) {
      med.totalStock += amount;
      med.refillNeeded = med.totalStock <= med.minThreshold;
      this.createNotification({
        title: 'Medicine Refilled',
        message: `${med.name} restocked with ${amount} pills. Total: ${med.totalStock}`,
        type: 'LOW_STOCK'
      });
      this.notify();
    }
  }

  public addSchedule(sch: Omit<Schedule, 'id'>) {
    const todayStr = new Date().toISOString().split('T')[0];
    const newSch: Schedule = {
      ...sch,
      id: `sch-${Date.now()}`
    };
    this.schedules.unshift(newSch);

    this.doses.unshift({
      id: `dose-${Date.now()}`,
      scheduleId: newSch.id,
      patientId: newSch.patientId,
      patientName: newSch.patientName,
      medicineId: newSch.medicineId,
      medicineName: newSch.medicineName,
      pillBoxId: newSch.pillBoxId,
      compartmentId: newSch.compartmentId,
      scheduledDate: todayStr,
      scheduledTime: newSch.scheduledTime,
      status: 'PENDING',
      dispensedBySensor: false
    });

    this.notify();
    return newSch;
  }
}

export const store = new SmartPillBoxStore();
