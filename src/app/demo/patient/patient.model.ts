export type PatientStatus = 'pending' | 'approved' | 'rejected';

export interface Patient {
  id: string;
  patientName: string;
  createdDate: Date;
  kByName: string;
  status: PatientStatus;
  gender: 'M' | 'F' | 'O';
  age: number;
  department: string;
  room: string;
  notes: string;
  avatarUrl?: string;
}
