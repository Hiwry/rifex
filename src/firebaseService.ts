import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Tournament,
  Participant,
  TournamentNumber,
  Payment,
  DrawResult,
  AuditLog,
  TournamentStatus,
  NumberStatus,
  PaymentStatus,
  TournamentHistoryEntry,
} from "./types";
import {
  seedTournament,
  seedParticipants,
  getSeedNumbers,
  seedPayments,
  seedAuditLogs,
} from "./seed";

/**
 * Recursively cleans any object to ensure there are no undefined fields before writing to Firestore.
 * Converting undefined values to null or omitting them prevents Firestore write errors.
 */
function sanitizeForFirestore(val: any): any {
  if (val === undefined) {
    return undefined;
  }
  if (val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore).filter((v) => v !== undefined);
  }
  if (typeof val === "object") {
    // Check if it's a Date
    if (val instanceof Date) {
      return val.toISOString();
    }
    const cleaned: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const cleanedValue = sanitizeForFirestore(val[key]);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return val;
}

// Standard collections
const TOURNAMENTS_COLLECTION = "tournaments";
const PARTICIPANTS_COLLECTION = "participants";
const NUMBERS_COLLECTION = "numbers";
const PAYMENTS_COLLECTION = "payments";
const DRAW_COLLECTION = "draws";
const LOGS_COLLECTION = "audit_logs";
const HISTORY_COLLECTION = "tournaments_history";

/**
 * Loads all data from Firestore, falls back to local seed data if database is empty.
 */
export async function loadRaffleData() {
  try {
    // 1. Load active tournament
    const tournamentDocRef = doc(db, TOURNAMENTS_COLLECTION, "active");
    const tournamentSnap = await getDoc(tournamentDocRef);
    let tournament: Tournament;
    let isNewSetup = false;

    if (tournamentSnap.exists()) {
      tournament = tournamentSnap.data() as Tournament;
    } else {
      isNewSetup = true;
      // Seed tournament
      tournament = seedTournament;
      await setDoc(tournamentDocRef, sanitizeForFirestore(tournament));
    }

    // 2. Load participants
    const participantsColRef = collection(db, PARTICIPANTS_COLLECTION);
    const participantsSnap = await getDocs(participantsColRef);
    let participants: Participant[] = [];

    if (!participantsSnap.empty) {
      participantsSnap.forEach((doc) => {
        participants.push(doc.data() as Participant);
      });
    } else if (isNewSetup) {
      // Seed participants ONLY during first setup
      participants = seedParticipants;
      const batch = writeBatch(db);
      seedParticipants.forEach((p) => {
        const pRef = doc(db, PARTICIPANTS_COLLECTION, p.id);
        batch.set(pRef, sanitizeForFirestore(p));
      });
      await batch.commit();
    }

    // 3. Load active numbers (reservations/payments)
    const numbersColRef = collection(db, NUMBERS_COLLECTION);
    const numbersSnap = await getDocs(numbersColRef);
    let dbNumbers: TournamentNumber[] = [];

    if (!numbersSnap.empty) {
      numbersSnap.forEach((doc) => {
        dbNumbers.push(doc.data() as TournamentNumber);
      });
    } else if (isNewSetup) {
      // Seed numbers ONLY during first setup (only seed the non-Available ones to save Firestore space)
      const initialSeedNums = getSeedNumbers();
      const activeSeedNums = initialSeedNums.filter(n => n.status !== NumberStatus.Disponivel);
      
      const batch = writeBatch(db);
      activeSeedNums.forEach((num) => {
        const numRef = doc(db, NUMBERS_COLLECTION, num.id);
        batch.set(numRef, sanitizeForFirestore(num));
      });
      await batch.commit();
      dbNumbers = activeSeedNums;
    }

    // Reconstruction of complete numbers array if not infinite
    let numbers: TournamentNumber[] = [];
    if (tournament.is_infinite) {
      numbers = dbNumbers;
    } else {
      // Re-create the complete list from start to end range, layering dbNumbers on top
      const start = tournament.number_start;
      const end = tournament.number_end;
      for (let i = start; i <= end; i++) {
        const dbNum = dbNumbers.find(n => n.number === i);
        if (dbNum) {
          numbers.push(dbNum);
        } else {
          numbers.push({
            id: `num_${tournament.id}_${i}`,
            tournament_id: tournament.id,
            participant_id: "",
            number: i,
            price: tournament.number_price,
            status: NumberStatus.Disponivel,
            payment_status: PaymentStatus.Pendente,
            created_at: tournament.created_at,
            updated_at: tournament.updated_at,
          });
        }
      }
    }

    // 4. Load payments
    const paymentsColRef = collection(db, PAYMENTS_COLLECTION);
    const paymentsSnap = await getDocs(paymentsColRef);
    let payments: Payment[] = [];

    if (!paymentsSnap.empty) {
      paymentsSnap.forEach((doc) => {
        payments.push(doc.data() as Payment);
      });
      // Sort payments newest first
      payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (isNewSetup) {
      payments = seedPayments;
      const batch = writeBatch(db);
      seedPayments.forEach((pay) => {
        const payRef = doc(db, PAYMENTS_COLLECTION, pay.id);
        batch.set(payRef, sanitizeForFirestore(pay));
      });
      await batch.commit();
    }

    // 5. Load draw result
    const drawDocRef = doc(db, DRAW_COLLECTION, "result");
    const drawSnap = await getDoc(drawDocRef);
    let drawResult: DrawResult | null = null;

    if (drawSnap.exists()) {
      drawResult = drawSnap.data() as DrawResult;
    }

    // 6. Load audit logs
    const logsColRef = collection(db, LOGS_COLLECTION);
    const logsSnap = await getDocs(logsColRef);
    let logs: AuditLog[] = [];

    if (!logsSnap.empty) {
      logsSnap.forEach((doc) => {
        logs.push(doc.data() as AuditLog);
      });
      // Sort logs newest first
      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (isNewSetup) {
      logs = seedAuditLogs;
      const batch = writeBatch(db);
      seedAuditLogs.forEach((log) => {
        const logRef = doc(db, LOGS_COLLECTION, log.id);
        batch.set(logRef, sanitizeForFirestore(log));
      });
      await batch.commit();
    }

    return {
      tournament,
      participants,
      numbers,
      payments,
      drawResult,
      logs,
    };
  } catch (error) {
    console.error("Failed to load raffle data from Firestore, falling back to LocalStorage:", error);
    return null;
  }
}

/**
 * Saves/Updates the active tournament.
 */
export async function saveTournamentToFirebase(tournament: Tournament) {
  try {
    const docRef = doc(db, TOURNAMENTS_COLLECTION, "active");
    await setDoc(docRef, sanitizeForFirestore(tournament));
  } catch (err) {
    console.error("Error saving tournament to Firebase:", err);
  }
}

/**
 * Saves/Updates a single participant.
 */
export async function saveParticipantToFirebase(participant: Participant) {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, participant.id);
    await setDoc(docRef, sanitizeForFirestore(participant));
  } catch (err) {
    console.error("Error saving participant to Firebase:", err);
  }
}

/**
 * Deletes a single participant.
 */
export async function deleteParticipantFromFirebase(id: string) {
  try {
    const docRef = doc(db, PARTICIPANTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting participant from Firebase:", err);
  }
}

/**
 * Reset/Clear all participants in Firebase when resetting database.
 */
export async function clearAllParticipantsInFirebase() {
  try {
    const colRef = collection(db, PARTICIPANTS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing participants in Firebase:", err);
  }
}

/**
 * Saves/Updates multiple numbers.
 * Supports batches to save on network roundtrips.
 */
export async function saveNumbersToFirebase(updatedNumbers: TournamentNumber[]) {
  try {
    const batch = writeBatch(db);
    updatedNumbers.forEach((num) => {
      const docRef = doc(db, NUMBERS_COLLECTION, num.id);
      if (num.status === NumberStatus.Disponivel) {
        // Delete from DB to keep it clean (Available means not present)
        batch.delete(docRef);
      } else {
        batch.set(docRef, sanitizeForFirestore(num));
      }
    });
    await batch.commit();
  } catch (err) {
    console.error("Error saving numbers to Firebase:", err);
  }
}

/**
 * Reset/Clear all numbers in Firebase when tournament is recreated.
 */
export async function clearAllNumbersInFirebase() {
  try {
    const colRef = collection(db, NUMBERS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing numbers in Firebase:", err);
  }
}

/**
 * Saves/Updates a single payment.
 */
export async function savePaymentToFirebase(payment: Payment) {
  try {
    const docRef = doc(db, PAYMENTS_COLLECTION, payment.id);
    await setDoc(docRef, sanitizeForFirestore(payment));
  } catch (err) {
    console.error("Error saving payment to Firebase:", err);
  }
}

/**
 * Clear all payments in Firebase when resetting.
 */
export async function clearAllPaymentsInFirebase() {
  try {
    const colRef = collection(db, PAYMENTS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing payments in Firebase:", err);
  }
}

/**
 * Saves/Updates the draw result. Pass null to reset/clear.
 */
export async function saveDrawResultToFirebase(drawResult: DrawResult | null) {
  try {
    const docRef = doc(db, DRAW_COLLECTION, "result");
    if (drawResult) {
      await setDoc(docRef, sanitizeForFirestore(drawResult));
    } else {
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.error("Error saving draw result to Firebase:", err);
  }
}

/**
 * Adds an audit log.
 */
export async function saveAuditLogToFirebase(log: AuditLog) {
  try {
    const docRef = doc(db, LOGS_COLLECTION, log.id);
    await setDoc(docRef, sanitizeForFirestore(log));
  } catch (err) {
    console.error("Error saving audit log to Firebase:", err);
  }
}

/**
 * Clear all audit logs in Firebase.
 */
export async function clearAllAuditLogsInFirebase() {
  try {
    const colRef = collection(db, LOGS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing audit logs in Firebase:", err);
  }
}

/**
 * Saves a completed tournament history entry to Firebase.
 */
export async function saveTournamentHistoryToFirebase(entry: TournamentHistoryEntry) {
  try {
    const docRef = doc(db, HISTORY_COLLECTION, entry.id);
    await setDoc(docRef, sanitizeForFirestore(entry));
  } catch (err) {
    console.error("Error saving tournament history to Firebase:", err);
  }
}

/**
 * Loads all completed tournament history entries from Firebase.
 */
export async function loadTournamentHistoryFromFirebase(): Promise<TournamentHistoryEntry[]> {
  try {
    const colRef = collection(db, HISTORY_COLLECTION);
    const snap = await getDocs(colRef);
    const history: TournamentHistoryEntry[] = [];
    snap.forEach((doc) => {
      history.push(doc.data() as TournamentHistoryEntry);
    });
    // Sort by finished_at newest first
    history.sort((a, b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime());
    return history;
  } catch (err) {
    console.error("Error loading tournament history from Firebase:", err);
    return [];
  }
}

/**
 * Clear all tournament history in Firebase.
 */
export async function clearAllHistoryInFirebase() {
  try {
    const colRef = collection(db, HISTORY_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing tournament history in Firebase:", err);
  }
}

/**
 * Loads the secondary admin if registered.
 */
export async function getSecondaryAdminFromFirebase(): Promise<any | null> {
  try {
    const docRef = doc(db, "settings", "secondary_admin");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.error("Error loading secondary admin from Firebase:", err);
    return null;
  }
}

/**
 * Registers the secondary admin in Firebase (only works once).
 */
export async function saveSecondaryAdminToFirebase(adminData: any): Promise<boolean> {
  try {
    const docRef = doc(db, "settings", "secondary_admin");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      // Already exists!
      return false;
    }
    await setDoc(docRef, sanitizeForFirestore(adminData));
    return true;
  } catch (err) {
    console.error("Error saving secondary admin to Firebase:", err);
    return false;
  }
}


