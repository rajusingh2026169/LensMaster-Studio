import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Customer, Booking, Invoice, Expense, InventoryItem, Employee, Team, TeamAssignment, CalendarItem, Inquiry, Quotation, PaymentRecord, WorkOrder, AttendanceRecord, SalaryRecord, LeaveRequest, EmployeeJobAssignment, ServiceCategory, StudioService, StudioPackage } from '../types';

/**
 * Utility function to recursively strip keys with `undefined` values from an object.
 * Firestore `setDoc`, `updateDoc`, and `addDoc` throw an error if any field is `undefined`.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        result[key] = cleanUndefined(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Global tenant context state to partition all collections dynamically
let currentStudioId: string | null = null;

export const tenantContext = {
  setStudioId: (studioId: string | null) => {
    currentStudioId = studioId;
  },
  getStudioId: () => {
    return currentStudioId;
  }
};

function getStudioIdOrThrow(): string {
  if (!currentStudioId) {
    throw new Error("No active studio ID set in database service. User must be logged in.");
  }
  return currentStudioId;
}

// ==========================================
// 1. CUSTOMERS SERVICE
// ==========================================

export const dbCustomers = {
  subscribe: (callback: (customers: Customer[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'customers');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const customers: Customer[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          customers.push({ id: doc.id, ...doc.data() } as Customer);
        });
        callback(customers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/customers`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'customers');
    const newDocRef = doc(colRef); // Generate unique ID client-side
    const fullCustomer: Customer = {
      ...customer,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullCustomer));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/customers/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, customer: Partial<Customer>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'customers', id);
    try {
      await updateDoc(docRef, cleanUndefined({ ...customer }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/customers/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'customers', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/customers/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 2. BOOKINGS SERVICE
// ==========================================

export const dbBookings = {
  subscribe: (callback: (bookings: Booking[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'bookings');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const bookings: Booking[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          bookings.push({ id: doc.id, ...doc.data() } as Booking);
        });
        callback(bookings);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/bookings`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'bookings');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullBooking: Booking = {
      ...booking,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullBooking));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/bookings/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, booking: Partial<Booking>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'bookings', id);
    const nowStr = new Date().toISOString();
    try {
      await updateDoc(docRef, cleanUndefined({
        ...booking,
        updatedAt: nowStr,
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/bookings/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'bookings', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/bookings/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 3. INVOICES SERVICE
// ==========================================

export const dbInvoices = {
  subscribe: (callback: (invoices: Invoice[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'invoices');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const invoices: Invoice[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          invoices.push({ id: doc.id, ...doc.data() } as Invoice);
        });
        callback(invoices);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/invoices`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'invoices');
    const newDocRef = doc(colRef);
    const fullInvoice: Invoice = {
      ...invoice,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullInvoice));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/invoices/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, invoice: Partial<Invoice>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'invoices', id);
    try {
      await updateDoc(docRef, cleanUndefined({ ...invoice }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/invoices/${id}`);
      throw error;
    }
  },
  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'invoices', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/invoices/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 4. EXPENSES SERVICE
// ==========================================

export const dbExpenses = {
  subscribe: (callback: (expenses: Expense[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'expenses');
    const q = query(colRef, orderBy('date', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const expenses: Expense[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          expenses.push({ id: doc.id, ...doc.data() } as Expense);
        });
        callback(expenses);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/expenses`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'expenses');
    const newDocRef = doc(colRef);
    const fullExpense: Expense = {
      ...expense,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullExpense));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/expenses/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, expense: Partial<Expense>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'expenses', id);
    try {
      await updateDoc(docRef, cleanUndefined({ ...expense }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/expenses/${id}`);
      throw error;
    }
  },
  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'expenses', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/expenses/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 5. INVENTORY SERVICE
// ==========================================

export const dbInventory = {
  subscribe: (callback: (inventory: InventoryItem[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'inventory');
    const q = query(colRef, orderBy('itemName', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const inventory: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          inventory.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        callback(inventory);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/inventory`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (item: Omit<InventoryItem, 'id' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'inventory');
    const newDocRef = doc(colRef);
    const fullItem: InventoryItem = {
      ...item,
      id: newDocRef.id,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullItem));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/inventory/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, item: Partial<InventoryItem>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'inventory', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...item,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/inventory/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'inventory', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/inventory/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 6. EMPLOYEES SERVICE
// ==========================================

export const dbEmployees = {
  subscribe: (callback: (employees: Employee[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'employees');
    const q = query(colRef, orderBy('name', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const employees: Employee[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          employees.push({ id: doc.id, ...doc.data() } as Employee);
        });
        callback(employees);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/employees`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'employees');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullEmp: Employee = {
      ...employee,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullEmp));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/employees/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, employee: Partial<Employee>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'employees', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...employee,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/employees/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'employees', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/employees/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 7. TEAMS SERVICE
// ==========================================

export const dbTeams = {
  subscribe: (callback: (teams: Team[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'teams');
    const q = query(colRef, orderBy('name', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const teams: Team[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          teams.push({ id: doc.id, ...doc.data() } as Team);
        });
        callback(teams);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/teams`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'teams');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullTeam: Team = {
      ...team,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullTeam));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/teams/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, team: Partial<Team>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'teams', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...team,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/teams/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'teams', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/teams/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 8. ASSIGNMENTS SERVICE
// ==========================================

export const dbAssignments = {
  subscribe: (callback: (assignments: any[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'assignments');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          list.push({ id: doc.id, ...doc.data() });
        });
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/assignments`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  setAssignment: async (orderId: string, assignment: TeamAssignment & { bookingDate: string }): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'assignments', orderId);
    try {
      await setDoc(docRef, cleanUndefined({
        ...assignment,
        orderId,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `studios/${studioId}/assignments/${orderId}`);
      throw error;
    }
  },

  deleteAssignment: async (orderId: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'assignments', orderId);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/assignments/${orderId}`);
      throw error;
    }
  }
};

// ==========================================
// 8B. ATTENDANCE SERVICE
// ==========================================

export const dbAttendance = {
  subscribe: (callback: (records: AttendanceRecord[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'attendance');
    const q = query(colRef, orderBy('date', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          records.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
        });
        callback(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/attendance`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  addOrUpdate: async (record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'attendance');
    const recordId = record.id || `${record.employeeId}_${record.date}`;
    const docRef = doc(colRef, recordId);
    const nowStr = new Date().toISOString();

    const fullRecord: AttendanceRecord = {
      id: recordId,
      ...record,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(docRef, cleanUndefined(fullRecord), { merge: true });
      return recordId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `studios/${studioId}/attendance/${recordId}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'attendance', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/attendance/${id}`);
      throw error;
    }
  }
};

// ==========================================
// 8C. PAYROLL / SALARY SERVICE
// ==========================================

export const dbPayroll = {
  subscribe: (callback: (records: SalaryRecord[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'payroll');
    const q = query(colRef, orderBy('month', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const records: SalaryRecord[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          records.push({ id: doc.id, ...doc.data() } as SalaryRecord);
        });
        callback(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/payroll`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (record: Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'payroll');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullRecord: SalaryRecord = {
      ...record,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullRecord));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/payroll/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, record: Partial<SalaryRecord>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'payroll', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...record,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/payroll/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'payroll', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/payroll/${id}`);
      throw error;
    }
  }
};

// ==========================================
// 8D. LEAVES SERVICE
// ==========================================

export const dbLeaves = {
  subscribe: (callback: (leaves: LeaveRequest[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'leaves');
    const q = query(colRef, orderBy('appliedOn', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const leaves: LeaveRequest[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          leaves.push({ id: doc.id, ...doc.data() } as LeaveRequest);
        });
        callback(leaves);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/leaves`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'leaves');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullLeave: LeaveRequest = {
      ...leave,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullLeave));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/leaves/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, leave: Partial<LeaveRequest>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'leaves', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...leave,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/leaves/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'leaves', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/leaves/${id}`);
      throw error;
    }
  }
};

// ==========================================
// 8E. EMPLOYEE JOB ASSIGNMENTS SERVICE
// ==========================================

export const dbEmployeeJobs = {
  subscribe: (callback: (jobs: EmployeeJobAssignment[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'employee_jobs');
    const q = query(colRef, orderBy('dueDate', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const jobs: EmployeeJobAssignment[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          jobs.push({ id: doc.id, ...doc.data() } as EmployeeJobAssignment);
        });
        callback(jobs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/employee_jobs`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (job: Omit<EmployeeJobAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'employee_jobs');
    const newDocRef = doc(colRef);
    const nowStr = new Date().toISOString();
    const fullJob: EmployeeJobAssignment = {
      ...job,
      id: newDocRef.id,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullJob));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/employee_jobs/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, job: Partial<EmployeeJobAssignment>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'employee_jobs', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...job,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/employee_jobs/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'employee_jobs', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/employee_jobs/${id}`);
      throw error;
    }
  }
};

// ==========================================
// 9. CALENDAR SERVICE
// ==========================================

export const dbCalendar = {
  subscribe: (callback: (items: CalendarItem[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'calendar');
    const q = query(colRef, orderBy('date', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: CalendarItem[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          items.push({ id: doc.id, ...doc.data() } as CalendarItem);
        });
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/calendar`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (item: Omit<CalendarItem, 'id'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'calendar');
    const newDocRef = doc(colRef);
    const fullItem: CalendarItem = {
      ...item,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullItem));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/calendar/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, item: Partial<CalendarItem>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'calendar', id);
    try {
      await updateDoc(docRef, cleanUndefined({ ...item }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/calendar/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'calendar', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/calendar/${id}`);
      throw error;
    }
  }
};

// ==========================================
// 10. INQUIRIES SERVICE
// ==========================================

export const dbInquiries = {
  subscribe: (callback: (inquiries: Inquiry[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'inquiries');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const inquiries: Inquiry[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          inquiries.push({ id: doc.id, ...doc.data() } as Inquiry);
        });
        callback(inquiries);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/inquiries`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (inquiry: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt' | 'inquiryNumber'> & { inquiryNumber?: string }): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'inquiries');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const inquiryNum = inquiry.inquiryNumber || `INQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullInquiry: Inquiry = {
      ...inquiry,
      id: newDocRef.id,
      inquiryNumber: inquiryNum,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullInquiry));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/inquiries/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, inquiry: Partial<Inquiry>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'inquiries', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...inquiry,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/inquiries/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'inquiries', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/inquiries/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 11. QUOTATIONS SERVICE
// ==========================================

export const dbQuotations = {
  subscribe: (callback: (quotations: Quotation[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'quotations');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const quotations: Quotation[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          quotations.push({ id: doc.id, ...doc.data() } as Quotation);
        });
        callback(quotations);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/quotations`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'quotationNumber'> & { quotationNumber?: string }): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'quotations');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const quoNum = quotation.quotationNumber || `QUO-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullQuotation: Quotation = {
      ...quotation,
      id: newDocRef.id,
      quotationNumber: quoNum,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullQuotation));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/quotations/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, quotation: Partial<Quotation>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'quotations', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...quotation,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/quotations/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'quotations', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/quotations/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 12. WORK ORDERS SERVICE
// ==========================================

export const dbOrders = {
  subscribe: (callback: (orders: WorkOrder[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'orders');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const orders: WorkOrder[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          orders.push({ id: doc.id, ...doc.data() } as WorkOrder);
        });
        callback(orders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/orders`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (order: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'orderNumber'> & { orderNumber?: string }): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'orders');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const orderNum = order.orderNumber || `WO-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullOrder: WorkOrder = {
      ...order,
      id: newDocRef.id,
      orderNumber: orderNum,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullOrder));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/orders/${newDocRef.id}`);
      throw error;
    }
  },

  update: async (id: string, order: Partial<WorkOrder>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'orders', id);
    try {
      await updateDoc(docRef, cleanUndefined({
        ...order,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studios/${studioId}/orders/${id}`);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'orders', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studios/${studioId}/orders/${id}`);
      throw error;
    }
  },
};

// ==========================================
// 13. PAYMENTS SERVICE
// ==========================================

export const dbPayments = {
  subscribe: (callback: (payments: PaymentRecord[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'payments');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const payments: PaymentRecord[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          payments.push({ id: doc.id, ...doc.data() } as PaymentRecord);
        });
        callback(payments);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/payments`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  add: async (payment: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'payments');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();

    const fullPayment: PaymentRecord = {
      ...payment,
      id: newDocRef.id,
      createdAt: now,
    };

    try {
      await setDoc(newDocRef, cleanUndefined(fullPayment));
      return newDocRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studios/${studioId}/payments/${newDocRef.id}`);
      throw error;
    }
  },
};

/**
 * One-Click Conversion: Converts an approved Quotation into:
 * 1. Customer record (creates if not existing)
 * 2. Booking record
 * 3. Work Order record
 * 4. Calendar Item record (Event Schedule)
 * 5. Payment Record (if initial advance payment provided)
 * 6. Invoice record
 * 7. Updates Quotation status to 'converted_to_booking'
 * 8. Updates linked Inquiry status to 'confirmed'
 */
export async function convertQuotationToBooking(
  quotation: Quotation,
  advanceAmount: number = 0,
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' = 'upi'
): Promise<{ bookingId: string; invoiceId: string; customerId: string }> {
  const studioId = getStudioIdOrThrow();
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Ensure or find Customer ID
  let customerId = quotation.customerId;
  if (!customerId) {
    const customerDocRef = doc(collection(db, 'studios', studioId, 'customers'));
    customerId = customerDocRef.id;
    const newCust: Customer = {
      id: customerId,
      name: quotation.customerName,
      phone: quotation.customerPhone,
      email: quotation.customerEmail || '',
      address: quotation.customerAddress || '',
      createdAt: now,
    };
    batch.set(customerDocRef, cleanUndefined(newCust));
  }

  // 2. Create Booking Document
  const bookingDocRef = doc(collection(db, 'studios', studioId, 'bookings'));
  const bookingId = bookingDocRef.id;

  const totalAmount = quotation.grandTotal;
  const balanceDue = Math.max(0, totalAmount - advanceAmount);

  const bookingData: Booking = {
    id: bookingId,
    customerId,
    customerName: quotation.customerName,
    customerPhone: quotation.customerPhone,
    jobType: 'studio_shoot',
    subType: quotation.eventType || 'Photography Event',
    description: `Converted from Quotation ${quotation.quotationNumber}. Services: ${quotation.items.map(i => i.serviceName).join(', ')}`,
    bookingDate: quotation.eventDate || now.split('T')[0],
    deliveryDate: quotation.eventDate || now.split('T')[0],
    status: 'pending',
    totalAmount,
    advancePaid: advanceAmount,
    balanceDue,
    notes: `Quotation Ref: ${quotation.quotationNumber}. ${quotation.termsAndConditions ? 'Terms: ' + quotation.termsAndConditions : ''}`,
    requirements: {
      eventType: quotation.eventType || 'Photography Event',
      eventDate: quotation.eventDate || now.split('T')[0],
      eventTime: '09:00 AM',
      venue: quotation.eventVenue || '',
      numberOfDays: 1,
      numberOfCameras: 2,
      droneRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('drone')),
      ledWallRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('led')),
      craneRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('crane')),
      liveStreamingRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('stream')),
      photoEditingRequired: true,
      albumDesignRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('album')),
      albumPrintingRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('printing') || i.serviceName.toLowerCase().includes('album')),
      videoEditingRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('video')),
      highlightReelRequired: quotation.items.some(i => i.serviceName.toLowerCase().includes('film') || i.serviceName.toLowerCase().includes('highlight')),
      requiredDeliveryDate: quotation.eventDate || now.split('T')[0],
    },
    progress: {
      eventProgress: 'not_started',
      editingProgress: 'not_started',
      printingProgress: 'not_started',
      deliveryStatus: 'pending',
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
  batch.set(bookingDocRef, cleanUndefined(bookingData));

  // 3. Create Work Order Document
  const orderDocRef = doc(collection(db, 'studios', studioId, 'orders'));
  const orderData: WorkOrder = {
    id: orderDocRef.id,
    orderNumber: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
    bookingId,
    quotationId: quotation.id,
    customerId,
    customerName: quotation.customerName,
    customerPhone: quotation.customerPhone,
    eventType: quotation.eventType,
    eventDate: quotation.eventDate,
    venue: quotation.eventVenue || '',
    items: quotation.items,
    progress: {
      eventProgress: 'not_started',
      editingProgress: 'not_started',
      printingProgress: 'not_started',
      deliveryStatus: 'pending',
      updatedAt: now,
    },
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };
  batch.set(orderDocRef, cleanUndefined(orderData));

  // 4. Create Calendar Item (Event Schedule)
  const calDocRef = doc(collection(db, 'studios', studioId, 'calendar'));
  const calItem: CalendarItem = {
    id: calDocRef.id,
    title: `${quotation.customerName} - ${quotation.eventType}`,
    date: quotation.eventDate || now.split('T')[0],
    time: '09:00 AM',
    type: 'team_booking',
    status: 'busy',
    entityId: bookingId,
    entityType: 'booking',
    details: `Venue: ${quotation.eventVenue || 'TBD'}. Services: ${quotation.items.map(i => i.serviceName).join(', ')}`,
    createdAt: now,
  };
  batch.set(calDocRef, cleanUndefined(calItem));

  // 5. Create Invoice Document
  const invoiceDocRef = doc(collection(db, 'studios', studioId, 'invoices'));
  const invoiceId = invoiceDocRef.id;
  const invoiceNum = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

  const paymentStatus = advanceAmount >= totalAmount ? 'paid' : (advanceAmount > 0 ? 'partially_paid' : 'unpaid');

  const invoiceData: Invoice = {
    id: invoiceId,
    bookingId,
    customerId,
    customerName: quotation.customerName,
    invoiceNumber: invoiceNum,
    items: quotation.items.map((item) => ({
      id: item.id,
      description: `${item.serviceName}${item.description ? ' - ' + item.description : ''}`,
      rate: item.unitPrice,
      qty: item.quantity,
      total: item.total,
    })),
    subtotal: quotation.subTotal,
    discount: quotation.totalDiscount,
    tax: quotation.totalGst,
    grandTotal: quotation.grandTotal,
    paidAmount: advanceAmount,
    paymentStatus,
    paymentMethod,
    invoiceDate: now.split('T')[0],
    createdAt: now,
  };
  batch.set(invoiceDocRef, cleanUndefined(invoiceData));

  // 6. Create Payment Record if advance paid
  if (advanceAmount > 0) {
    const paymentDocRef = doc(collection(db, 'studios', studioId, 'payments'));
    const paymentData: PaymentRecord = {
      id: paymentDocRef.id,
      bookingId,
      invoiceId,
      customerId,
      customerName: quotation.customerName,
      amount: advanceAmount,
      paymentType: advanceAmount >= totalAmount ? 'full' : 'advance',
      paymentMethod,
      paymentDate: now.split('T')[0],
      notes: `Advance payment upon booking quotation ${quotation.quotationNumber}`,
      createdAt: now,
    };
    batch.set(paymentDocRef, cleanUndefined(paymentData));
  }

  // 7. Update Quotation Status
  const quoDocRef = doc(db, 'studios', studioId, 'quotations', quotation.id);
  batch.update(quoDocRef, {
    status: 'converted_to_booking',
    convertedBookingId: bookingId,
    updatedAt: now,
  });

  // 8. Update Inquiry Status if linked
  if (quotation.inquiryId) {
    const inqDocRef = doc(db, 'studios', studioId, 'inquiries', quotation.inquiryId);
    batch.update(inqDocRef, {
      status: 'confirmed',
      updatedAt: now,
    });
  }

  await batch.commit();

  return { bookingId, invoiceId, customerId };
}

// ==========================================
// 6. ADMIN & SUPER ADMIN SERVICE
// ==========================================

export const dbAdmin = {
  getAllStudios: async (): Promise<any[]> => {
    try {
      const colRef = collection(db, 'studios');
      const snap = await getDocs(colRef);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (error) {
      console.error("Admin Error fetching studios:", error);
      throw error;
    }
  },

  getAllUsers: async (): Promise<any[]> => {
    try {
      const colRef = collection(db, 'users');
      const snap = await getDocs(colRef);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (error) {
      console.error("Admin Error fetching users:", error);
      throw error;
    }
  },

  updateStudioStatus: async (studioId: string, status: 'active' | 'suspended'): Promise<void> => {
    try {
      const docRef = doc(db, 'studios', studioId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      await dbAdmin.logAction('STUDIO_STATUS_CHANGED', `Studio ${studioId} status set to ${status}`);
    } catch (error) {
      console.error("Admin Error updating studio status:", error);
      throw error;
    }
  },

  updateStudioPlan: async (studioId: string, plan: string, isPremium: boolean): Promise<void> => {
    try {
      const docRef = doc(db, 'studios', studioId);
      await updateDoc(docRef, {
        plan,
        isPremium,
        updatedAt: new Date().toISOString()
      });
      await dbAdmin.logAction('STUDIO_PLAN_CHANGED', `Studio ${studioId} plan updated to ${plan} (Premium: ${isPremium})`);
    } catch (error) {
      console.error("Admin Error updating studio plan:", error);
      throw error;
    }
  },

  deleteStudio: async (studioId: string): Promise<void> => {
    try {
      // Delete main studio document
      await deleteDoc(doc(db, 'studios', studioId));
      await dbAdmin.logAction('STUDIO_DELETED', `Studio ${studioId} has been deleted completely`);
    } catch (error) {
      console.error("Admin Error deleting studio:", error);
      throw error;
    }
  },

  deleteUser: async (uid: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      await dbAdmin.logAction('USER_DELETED', `User ${uid} profile deleted from users collection`);
    } catch (error) {
      console.error("Admin Error deleting user:", error);
      throw error;
    }
  },

  logAction: async (actionType: string, message: string): Promise<void> => {
    try {
      const logRef = collection(db, 'admin_logs');
      await addDoc(logRef, {
        actionType,
        message,
        timestamp: new Date().toISOString(),
        adminEmail: 'admin@lensmaster.com' // default or current
      });
    } catch (e) {
      console.error("Error writing admin log:", e);
    }
  },

  getAdminLogs: async (): Promise<any[]> => {
    try {
      const colRef = collection(db, 'admin_logs');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (error) {
      // Fallback if index is not ready yet or collection missing
      console.warn("Could not retrieve logs, falling back to local list:", error);
      return [];
    }
  },

  createStudioManually: async (
    studioId: string,
    businessName: string,
    ownerName: string,
    email: string,
    mobileNumber: string,
    address: string,
    plan: string = 'Free Trial',
    status: 'active' | 'suspended' = 'active'
  ): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const studioRef = doc(db, 'studios', studioId);
      batch.set(studioRef, {
        businessName,
        ownerName,
        email,
        mobileNumber,
        phone: mobileNumber,
        address,
        status,
        plan,
        isPremium: plan.toLowerCase().includes('premium') || plan.toLowerCase().includes('enterprise'),
        createdAt: now,
        updatedAt: now,
        invoiceCounter: 100
      });

      const settingsRef = doc(db, 'studios', studioId, 'settings', 'settings');
      batch.set(settingsRef, {
        profile: {
          studioName: businessName,
          businessName,
          ownerName,
          mobileNumber,
          email,
          address,
          gstNumber: ''
        },
        settings: {
          taxRate: 18,
          currency: 'INR',
          invoicePrefix: 'INV-',
          invoiceFooter: `Thank you for choosing ${businessName}!`,
          terms: '1. All disputes are subject to local jurisdiction.\n2. Goods once sold/printed cannot be returned or cancelled.\n3. Please pay dues before delivery.',
          authorizedSignatory: ownerName,
          printPreferences: {
            showLogo: true,
            showSignature: true,
            paperSize: 'A4'
          }
        },
        createdAt: now,
        updatedAt: now
      });

      // Initialize subcollections
      batch.set(doc(db, 'studios', studioId, 'customers', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'bookings', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'expenses', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'inventory', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'employees', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'teams', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'assignments', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'calendar', '_init'), { initialized: true });

      await batch.commit();
      await dbAdmin.logAction('STUDIO_MANUALLY_CREATED', `Studio '${businessName}' manually created with ID: ${studioId}`);
    } catch (error) {
      console.error("Admin Error creating studio manually:", error);
      throw error;
    }
  },

  updateStudioDetails: async (studioId: string, fields: any): Promise<void> => {
    try {
      const docRef = doc(db, 'studios', studioId);
      await updateDoc(docRef, {
        ...fields,
        updatedAt: new Date().toISOString()
      });

      // Sync settings doc if we are updating basic studio profile fields
      const settingsRef = doc(db, 'studios', studioId, 'settings', 'settings');
      const settingsSnap = await getDocs(collection(db, 'studios', studioId, 'settings'));
      if (!settingsSnap.empty) {
        const setDocRef = doc(db, 'studios', studioId, 'settings', 'settings');
        const updatedProfileFields: any = {};
        if (fields.businessName) {
          updatedProfileFields['profile.businessName'] = fields.businessName;
          updatedProfileFields['profile.studioName'] = fields.businessName;
        }
        if (fields.ownerName) updatedProfileFields['profile.ownerName'] = fields.ownerName;
        if (fields.email) updatedProfileFields['profile.email'] = fields.email;
        if (fields.mobileNumber) updatedProfileFields['profile.mobileNumber'] = fields.mobileNumber;
        if (fields.address) updatedProfileFields['profile.address'] = fields.address;

        if (Object.keys(updatedProfileFields).length > 0) {
          await updateDoc(setDocRef, updatedProfileFields);
        }
      }

      await dbAdmin.logAction('STUDIO_UPDATED', `Studio ${studioId} details updated.`);
    } catch (error) {
      console.error("Admin Error updating studio details:", error);
      throw error;
    }
  },

  createUserManually: async (
    uid: string,
    email: string,
    ownerName: string,
    role: string = 'owner',
    studioId: string
  ): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      // Create main users/{uid} document
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        uid,
        email: email.trim().toLowerCase(),
        ownerName,
        role,
        studioId,
        createdAt: now,
        updatedAt: now
      });

      // If associated with a studio and is owner/staff, add to studio subcollection
      if (studioId && studioId !== 'admin') {
        const studioUserRef = doc(db, 'studios', studioId, 'users', uid);
        batch.set(studioUserRef, {
          uid,
          email: email.trim().toLowerCase(),
          role,
          ownerName,
          createdAt: now,
          updatedAt: now
        });
      }

      await batch.commit();
      await dbAdmin.logAction('USER_MANUALLY_CREATED', `User profile '${ownerName}' manually created for UID ${uid}`);
    } catch (error) {
      console.error("Admin Error creating user manually:", error);
      throw error;
    }
  },

  updateUserDetails: async (uid: string, fields: any): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User with UID ${uid} does not exist in Firestore.`);
      }
      const existingData = userSnap.data();
      const updatedFields = {
        ...fields,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updatedFields);

      // Also sync user in studio subcollection
      const sId = fields.studioId || existingData.studioId;
      if (sId && sId !== 'admin') {
        const studioUserRef = doc(db, 'studios', sId, 'users', uid);
        await setDoc(studioUserRef, {
          uid,
          email: fields.email || existingData.email,
          role: fields.role || existingData.role || 'owner',
          ownerName: fields.ownerName || existingData.ownerName || 'Owner',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await dbAdmin.logAction('USER_UPDATED', `User document ${uid} updated.`);
    } catch (error) {
      console.error("Admin Error updating user details:", error);
      throw error;
    }
  },

  repairMissingSubcollections: async (studioId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'studios', studioId, 'customers', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'bookings', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'expenses', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'inventory', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'employees', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'teams', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'assignments', '_init'), { initialized: true });
      batch.set(doc(db, 'studios', studioId, 'calendar', '_init'), { initialized: true });
      await batch.commit();
      await dbAdmin.logAction('SUBCOLLECTIONS_REPAIRED', `Missing subcollections repaired for studio ${studioId}`);
    } catch (error) {
      console.error("Admin Error repairing subcollections:", error);
      throw error;
    }
  },

  syncUserAndStudioRecords: async (): Promise<{ syncedCount: number }> => {
    try {
      const usersCol = collection(db, 'users');
      const studiosCol = collection(db, 'studios');
      const usersSnap = await getDocs(usersCol);
      const studiosSnap = await getDocs(studiosCol);

      const studiosMap = new Map();
      studiosSnap.forEach(d => studiosMap.set(d.id, d.data()));

      let syncedCount = 0;
      for (const userDoc of usersSnap.docs) {
        const uData = userDoc.data();
        const sId = uData.studioId;
        if (sId && sId !== 'admin' && studiosMap.has(sId)) {
          // Verify subcollection doc users/{uid} inside studios/{studioId}
          const studioUserRef = doc(db, 'studios', sId, 'users', userDoc.id);
          await setDoc(studioUserRef, {
            uid: userDoc.id,
            email: uData.email,
            role: uData.role || 'owner',
            ownerName: uData.ownerName || 'Owner',
            createdAt: uData.createdAt || new Date().toISOString()
          }, { merge: true });
          syncedCount++;
        }
      }

      await dbAdmin.logAction('RECORDS_SYNCED', `Synced ${syncedCount} user/studio relational subcollection documents.`);
      return { syncedCount };
    } catch (error) {
      console.error("Admin Error syncing records:", error);
      throw error;
    }
  },

  deleteOrphanDocuments: async (): Promise<{ deletedUsers: number, deletedStudios: number }> => {
    try {
      const usersCol = collection(db, 'users');
      const studiosCol = collection(db, 'studios');
      const usersSnap = await getDocs(usersCol);
      const studiosSnap = await getDocs(studiosCol);

      const studioIds = new Set(studiosSnap.docs.map(d => d.id));
      let deletedUsers = 0;
      let deletedStudios = 0;

      // Find users whose studioId is deleted and delete or un-link them
      for (const userDoc of usersSnap.docs) {
        const uData = userDoc.data();
        const sId = uData.studioId;
        if (sId && sId !== 'admin' && !studioIds.has(sId)) {
          // Delete user doc or set studioId to null
          await deleteDoc(doc(db, 'users', userDoc.id));
          deletedUsers++;
        }
      }

      await dbAdmin.logAction('ORPHANS_CLEANED', `Safely cleaned up orphans: deleted ${deletedUsers} orphaned user records.`);
      return { deletedUsers, deletedStudios };
    } catch (error) {
      console.error("Admin Error deleting orphan documents:", error);
      throw error;
    }
  },

  createDemoStudio: async (businessName: string, ownerName: string, email: string): Promise<string> => {
    const demoStudioId = 'demo_' + doc(collection(db, 'studios')).id;
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Create Studio document
    const studioRef = doc(db, 'studios', demoStudioId);
    batch.set(studioRef, {
      businessName,
      ownerName,
      email,
      mobileNumber: '+91 9999988888',
      phone: '+91 9999988888',
      address: '123, Creative Street, Photo City',
      gstNumber: '09DEMO1234A1Z0',
      invoiceCounter: 105,
      status: 'active',
      plan: 'Premium Annual',
      isPremium: true,
      createdAt: now,
      updatedAt: now
    });

    // Create Settings
    const settingsRef = doc(db, 'studios', demoStudioId, 'settings', 'settings');
    const defaultSettings = {
      profile: {
        studioName: businessName,
        ownerName,
        mobileNumber: '+91 9999988888',
        email,
        address: '123, Creative Street, Photo City',
        gstNumber: '09DEMO1234A1Z0',
        studioLogo: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200'
      },
      settings: {
        taxRate: 18,
        currency: 'INR',
        invoicePrefix: 'DEMO-',
        terms: '1. Subject to local jurisdiction.\n2. Standard warranty applies.\n3. Complete payments before dispatch.',
        authorizedSignatory: ownerName,
        printPreferences: {
          showLogo: true,
          showSignature: true,
          paperSize: 'A4'
        }
      }
    };
    batch.set(settingsRef, {
      ...defaultSettings,
      createdAt: now,
      updatedAt: now
    });

    // Subcollections initialization docs
    batch.set(doc(db, 'studios', demoStudioId, 'customers', '_init'), { initialized: true });
    batch.set(doc(db, 'studios', demoStudioId, 'bookings', '_init'), { initialized: true });
    batch.set(doc(db, 'studios', demoStudioId, 'expenses', '_init'), { initialized: true });
    batch.set(doc(db, 'studios', demoStudioId, 'inventory', '_init'), { initialized: true });

    // Add some realistic demo customers
    const cust1Id = doc(collection(db, 'studios', demoStudioId, 'customers')).id;
    batch.set(doc(db, 'studios', demoStudioId, 'customers', cust1Id), {
      id: cust1Id,
      name: 'Rohan Sharma',
      phone: '9876543210',
      email: 'rohan@example.com',
      address: 'Khaga, Fatehpur, UP',
      createdAt: now
    });

    const cust2Id = doc(collection(db, 'studios', demoStudioId, 'customers')).id;
    batch.set(doc(db, 'studios', demoStudioId, 'customers', cust2Id), {
      id: cust2Id,
      name: 'Priya Patel',
      phone: '9123456789',
      email: 'priya@example.com',
      address: 'Civil Lines, Prayagraj',
      createdAt: now
    });

    // Add a demo booking
    const bookingId = doc(collection(db, 'studios', demoStudioId, 'bookings')).id;
    batch.set(doc(db, 'studios', demoStudioId, 'bookings', bookingId), {
      id: bookingId,
      customerId: cust1Id,
      customerName: 'Rohan Sharma',
      customerPhone: '9876543210',
      jobType: 'studio_shoot',
      subType: 'Wedding Portrait Session',
      description: 'Outdoor pre-wedding photoshoot at historical gardens.',
      bookingDate: now.split('T')[0],
      deliveryDate: now.split('T')[0],
      status: 'completed',
      totalAmount: 15000,
      advancePaid: 5000,
      balanceDue: 10000,
      createdAt: now,
      updatedAt: now
    });

    // Add some inventory
    const invId = doc(collection(db, 'studios', demoStudioId, 'inventory')).id;
    batch.set(doc(db, 'studios', demoStudioId, 'inventory', invId), {
      id: invId,
      itemName: 'Glossy Photo Paper A4',
      quantity: 120,
      minThreshold: 30,
      unit: 'sheets',
      updatedAt: now
    });

    await batch.commit();
    await dbAdmin.logAction('DEMO_STUDIO_CREATED', `Demo studio '${businessName}' generated with ID ${demoStudioId}`);
    return demoStudioId;
  }
};

// ==========================================
// 15. STUDIO SERVICE CATEGORIES SERVICE
// ==========================================
export const dbServiceCategories = {
  subscribe: (callback: (categories: ServiceCategory[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'serviceCategories');
    const q = query(colRef, orderBy('displayOrder', 'asc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        const categories: ServiceCategory[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          categories.push({ id: doc.id, ...doc.data() } as ServiceCategory);
        });

        // Seed default categories if empty
        if (categories.length === 0) {
          try {
            await dbServiceCategories.seedDefaults(studioId);
          } catch (e) {
            console.warn("Could not seed default categories:", e);
          }
        }

        callback(categories);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/serviceCategories`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  seedDefaults: async (studioId: string) => {
    const defaultCategories = [
      { name: 'Wedding Photography', description: 'Traditional & candid wedding photography', displayOrder: 1 },
      { name: 'Wedding Videography', description: 'Cinematic HD/4K films & teaser trailers', displayOrder: 2 },
      { name: 'Pre-Wedding & Engagement', description: 'Outdoor romantic shoots & engagement coverage', displayOrder: 3 },
      { name: 'Birthday & Events', description: 'Birthdays, anniversaries & corporate celebrations', displayOrder: 4 },
      { name: 'Drone & Live Streaming', description: 'Aerial drone 4K shots & YouTube live broadcast', displayOrder: 5 },
      { name: 'Album Design & Printing', description: 'Canvera/Velvet custom photobooks & acrylic prints', displayOrder: 6 },
      { name: 'Printing Press & Banners', description: 'Flex, banners, mugs, photo frames & cards', displayOrder: 7 },
      { name: 'Custom Services', description: 'Tailored photography & printing solutions', displayOrder: 8 },
    ];

    const batch = writeBatch(db);
    const colRef = collection(db, 'studios', studioId, 'serviceCategories');
    defaultCategories.forEach((cat) => {
      const docRef = doc(colRef);
      batch.set(docRef, cleanUndefined({
        id: docRef.id,
        ...cat,
        createdAt: new Date().toISOString()
      }));
    });
    await batch.commit();
  },

  add: async (category: Omit<ServiceCategory, 'id' | 'createdAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'serviceCategories');
    const newDocRef = doc(colRef);
    const newCat: ServiceCategory = {
      ...category,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDocRef, cleanUndefined(newCat));
    return newDocRef.id;
  },

  update: async (id: string, updates: Partial<ServiceCategory>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'serviceCategories', id);
    await updateDoc(docRef, cleanUndefined(updates));
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'serviceCategories', id);
    await deleteDoc(docRef);
  }
};

// ==========================================
// 16. STUDIO SERVICES SERVICE
// ==========================================
export const dbStudioServices = {
  subscribe: (callback: (services: StudioService[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'services');
    const q = query(colRef, orderBy('displayOrder', 'asc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        const services: StudioService[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          services.push({ id: doc.id, ...doc.data() } as StudioService);
        });

        // Seed default studio services if empty
        if (services.length === 0) {
          try {
            await dbStudioServices.seedDefaults(studioId);
          } catch (e) {
            console.warn("Could not seed default studio services:", e);
          }
        }

        callback(services);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/services`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  seedDefaults: async (studioId: string) => {
    const now = new Date().toISOString();
    const defaultServices: Omit<StudioService, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Wedding Photography',
        categoryId: 'cat_wedding_photo',
        categoryName: 'Wedding Photography',
        shortDescription: 'Traditional & candid coverage for main wedding function',
        fullDescription: 'Comprehensive full-day coverage by experienced wedding photographer. High resolution retouched images delivered on USB drive.',
        basePrice: 45000,
        discount: 2000,
        gst: 18,
        unit: 'Per Day',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: true,
        popularBadge: true,
        displayOrder: 1,
        status: 'active',
        serviceColor: '#2563eb',
        variants: [
          { id: 'v1', variantName: 'Basic', price: 35000, features: ['1 Photographer', 'Traditional Photography', 'Raw & Edited Photos'], duration: '1 Day', numberOfPhotographers: 1, numberOfCameras: 1 },
          { id: 'v2', variantName: 'Standard', price: 45000, features: ['1 Candid + 1 Traditional Photographer', '300 Retouched Photos', 'Digital Drive'], duration: '1 Day', numberOfPhotographers: 2, numberOfCameras: 2 },
          { id: 'v3', variantName: 'Premium Luxury', price: 75000, features: ['2 Candid Photographers', 'Full Day Coverage', 'Complimentary Mini Album'], duration: '1 Day', numberOfPhotographers: 2, numberOfCameras: 3 }
        ]
      },
      {
        name: 'Wedding Cinematic Film',
        categoryId: 'cat_wedding_video',
        categoryName: 'Wedding Videography',
        shortDescription: '4K Ultra HD cinematic teaser & documentary film',
        fullDescription: 'High quality multi-camera video recording with professional sound design, color grading, teaser reel & complete edited movie.',
        basePrice: 50000,
        discount: 3000,
        gst: 18,
        unit: 'Per Day',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: true,
        popularBadge: true,
        displayOrder: 2,
        status: 'active',
        serviceColor: '#7c3aed'
      },
      {
        name: 'Pre-Wedding Shoot',
        categoryId: 'cat_prewedding',
        categoryName: 'Pre-Wedding & Engagement',
        shortDescription: 'Outdoor location photo & video trailer shoot',
        fullDescription: 'Creative outdoor shoot with multiple outfit changes, drone aerial shots, color graded cinematic teaser video.',
        basePrice: 25000,
        discount: 1000,
        gst: 18,
        unit: 'Session',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: true,
        popularBadge: false,
        displayOrder: 3,
        status: 'active',
        serviceColor: '#ec4899'
      },
      {
        name: '4K Aerial Drone Coverage',
        categoryId: 'cat_drone',
        categoryName: 'Drone & Live Streaming',
        shortDescription: 'Professional aerial video & venue photography',
        fullDescription: 'Licensed drone operator for breathtaking aerial shots of procession, venue and outdoor rituals.',
        basePrice: 18000,
        discount: 0,
        gst: 18,
        unit: 'Per Day',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: false,
        popularBadge: true,
        displayOrder: 4,
        status: 'active',
        serviceColor: '#059669'
      },
      {
        name: 'Multi-Cam Live Streaming',
        categoryId: 'cat_drone',
        categoryName: 'Drone & Live Streaming',
        shortDescription: 'YouTube / Facebook live broadcasting with graphics',
        fullDescription: '3-camera switcher setup for instant online broadcast so relatives anywhere in the world can watch live.',
        basePrice: 20000,
        discount: 0,
        gst: 18,
        unit: 'Per Day',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: false,
        popularBadge: false,
        displayOrder: 5,
        status: 'active',
        serviceColor: '#d97706'
      },
      {
        name: 'Silk Velvet Photobook Album',
        categoryId: 'cat_album',
        categoryName: 'Album Design & Printing',
        shortDescription: '30-page premium velvet photobook with acrylic cover',
        fullDescription: 'Storybook designer layout printed on waterproof non-tearable high sheen paper with lifetime warranty box.',
        basePrice: 15000,
        discount: 1000,
        gst: 18,
        unit: 'Per Piece',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: true,
        popularBadge: true,
        displayOrder: 6,
        status: 'active',
        serviceColor: '#0284c7'
      },
      {
        name: 'Printing Press & Flex Banner',
        categoryId: 'cat_print',
        categoryName: 'Printing Press & Banners',
        shortDescription: 'High resolution outdoor flex, vinyl & photo frames',
        fullDescription: 'Custom size flex printing for event entrance, photo frames with wood molding, mug & t-shirt merchandise.',
        basePrice: 5000,
        discount: 0,
        gst: 12,
        unit: 'Per Piece',
        minQuantity: 1,
        isAvailable: true,
        isFeatured: false,
        popularBadge: false,
        displayOrder: 7,
        status: 'active',
        serviceColor: '#475569'
      }
    ];

    const batch = writeBatch(db);
    const colRef = collection(db, 'studios', studioId, 'services');
    defaultServices.forEach((s) => {
      const docRef = doc(colRef);
      batch.set(docRef, cleanUndefined({
        ...s,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      }));
    });
    await batch.commit();
  },

  add: async (service: Omit<StudioService, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'services');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const newService: StudioService = {
      ...service,
      id: newDocRef.id,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(newDocRef, cleanUndefined(newService));
    return newDocRef.id;
  },

  update: async (id: string, updates: Partial<StudioService>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'services', id);
    await updateDoc(docRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'services', id);
    await deleteDoc(docRef);
  },

  duplicate: async (service: StudioService): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'services');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const duplicated: StudioService = {
      ...service,
      id: newDocRef.id,
      name: `${service.name} (Copy)`,
      displayOrder: service.displayOrder + 1,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(newDocRef, cleanUndefined(duplicated));
    return newDocRef.id;
  }
};

// ==========================================
// 17. STUDIO PACKAGES SERVICE
// ==========================================
export const dbStudioPackages = {
  subscribe: (callback: (packages: StudioPackage[]) => void, onError?: (err: Error) => void) => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'packages');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      async (snapshot) => {
        const packages: StudioPackage[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_init') return;
          packages.push({ id: doc.id, ...doc.data() } as StudioPackage);
        });

        // Seed default packages if empty
        if (packages.length === 0) {
          try {
            await dbStudioPackages.seedDefaults(studioId);
          } catch (e) {
            console.warn("Could not seed default packages:", e);
          }
        }

        callback(packages);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `studios/${studioId}/packages`);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    );
  },

  seedDefaults: async (studioId: string) => {
    const now = new Date().toISOString();
    const defaultPackages: Omit<StudioPackage, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        packageName: 'Silver Wedding Package',
        packagePrice: 75000,
        discount: 5000,
        description: 'Ideal for 1-day wedding celebrations. Includes Traditional Photo + Full HD Film + Velvet Album.',
        includedServices: [
          { serviceId: 's1', serviceName: 'Wedding Photography', quantity: 1, unitPrice: 45000 },
          { serviceId: 's2', serviceName: 'Wedding Cinematic Film', quantity: 1, unitPrice: 35000 }
        ]
      },
      {
        packageName: 'Gold Grand Package',
        packagePrice: 135000,
        discount: 10000,
        description: 'Most popular package! Candid Photo + Cinematic Film + Pre-Wedding Shoot + 4K Drone + Velvet Album.',
        includedServices: [
          { serviceId: 's1', serviceName: 'Wedding Photography', quantity: 1, unitPrice: 45000 },
          { serviceId: 's2', serviceName: 'Wedding Cinematic Film', quantity: 1, unitPrice: 50000 },
          { serviceId: 's3', serviceName: 'Pre-Wedding Shoot', quantity: 1, unitPrice: 25000 },
          { serviceId: 's4', serviceName: '4K Aerial Drone Coverage', quantity: 1, unitPrice: 18000 }
        ]
      },
      {
        packageName: 'Royal Luxury Wedding Package',
        packagePrice: 225000,
        discount: 20000,
        description: 'Complete luxury solution: 2 Photographers + 2 Cinematographers + Drone + Live Streaming + 2 Acrylic Albums + Teaser Reel.',
        includedServices: [
          { serviceId: 's1', serviceName: 'Wedding Photography', quantity: 2, unitPrice: 45000 },
          { serviceId: 's2', serviceName: 'Wedding Cinematic Film', quantity: 2, unitPrice: 50000 },
          { serviceId: 's3', serviceName: '4K Aerial Drone Coverage', quantity: 1, unitPrice: 18000 },
          { serviceId: 's5', serviceName: 'Multi-Cam Live Streaming', quantity: 1, unitPrice: 20000 },
          { serviceId: 's6', serviceName: 'Silk Velvet Photobook Album', quantity: 2, unitPrice: 15000 }
        ]
      }
    ];

    const batch = writeBatch(db);
    const colRef = collection(db, 'studios', studioId, 'packages');
    defaultPackages.forEach((pkg) => {
      const docRef = doc(colRef);
      batch.set(docRef, cleanUndefined({
        ...pkg,
        id: docRef.id,
        createdAt: now,
        updatedAt: now
      }));
    });
    await batch.commit();
  },

  add: async (pkg: Omit<StudioPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const studioId = getStudioIdOrThrow();
    const colRef = collection(db, 'studios', studioId, 'packages');
    const newDocRef = doc(colRef);
    const now = new Date().toISOString();
    const newPkg: StudioPackage = {
      ...pkg,
      id: newDocRef.id,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(newDocRef, cleanUndefined(newPkg));
    return newDocRef.id;
  },

  update: async (id: string, updates: Partial<StudioPackage>): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'packages', id);
    await updateDoc(docRef, cleanUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  },

  delete: async (id: string): Promise<void> => {
    const studioId = getStudioIdOrThrow();
    const docRef = doc(db, 'studios', studioId, 'packages', id);
    await deleteDoc(docRef);
  }
};


