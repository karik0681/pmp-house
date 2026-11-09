import { Cfg } from '../configurator/model';

export interface Note { at: string; text: string }
export interface Lead {
  id: string;
  createdAt: string;
  name: string; phone: string; email: string; place: string; clientNote: string;
  cfg: Cfg;
  price: number | null;
  source: string;
  status: number;        // 0 new … 4 sold
  next: string;          // next step
  due: string;           // yyyy-mm-dd, '' when none
  notes: Note[];
  demo?: boolean;
}
export const STATUSES = [0, 1, 2, 3, 4];
