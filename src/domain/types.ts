// Row types. Column names mirror the database (snake_case) so rows from
// Supabase can be used as-is.

export type ISODate = string // 'YYYY-MM-DD'
export type Mode = 'train' | 'flight' | 'bus' | 'car' | 'other'

export interface Trip {
  id: string
  name: string
  start_date: ISODate
  end_date: ISODate
  home_label: string
}

export interface Stop {
  id: string
  trip_id: string
  position: number
  name: string
  name_zh: string | null
  lat: number
  lng: number
  nights: number
  no_booking_needed: boolean
  no_booking_note: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Leg {
  id: string
  trip_id: string
  from_stop_id: string | null // null = home (inbound)
  to_stop_id: string | null // null = home (outbound)
  mode: Mode
  overnight: boolean
  no_booking_needed: boolean
  no_booking_note: string | null
  manual_hours: number | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type ReservationKind = 'hotel' | 'transport' | 'activity' | 'other'

// Hotel: start_date = check-in, end_date = check-out.
// Transport: start_date = departure, end_date = arrival.
export interface Reservation {
  id: string
  trip_id: string
  stop_id: string | null
  leg_id: string | null
  activity_id: string | null
  kind: ReservationKind
  title: string
  confirmation: string | null
  start_date: ISODate | null
  start_time: string | null
  end_date: ISODate | null
  end_time: string | null
  address: string | null
  address_zh: string | null
  details: string | null
  created_by: string | null
  created_at: string
}

export interface Attachment {
  id: string
  reservation_id: string
  storage_path: string
  filename: string
  content_type: string | null
  created_by: string | null
  created_at: string
}

export type PlaceStatus = 'active' | 'suggested' | 'dismissed'

export interface Place {
  id: string
  trip_id: string
  stop_id: string | null // null = idea pin off the route
  name: string
  lat: number
  lng: number
  note: string | null
  source: 'manual' | 'claude'
  status: PlaceStatus
  wishlist_item_id: string | null
  created_by: string | null
  created_at: string
}

export type WishStatus = 'unchecked' | 'covered' | 'not_covered'

export interface WishlistItem {
  id: string
  trip_id: string
  text: string
  note: string | null
  status: WishStatus
  check_note: string | null
  covered_by_stop_id: string | null
  checked_at: string | null
  created_by: string | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string
}

export interface Task {
  id: string
  trip_id: string
  text: string
  done: boolean
  done_at: string | null
  assignee_ids: string[]
  stop_id: string | null
  due_date: ISODate | null
  source_todo_id: string | null // the suggestion it was copied from
  created_by: string | null
  created_at: string
}

export interface Activity {
  id: string
  trip_id: string
  stop_id: string
  title: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ActivityVote {
  activity_id: string
  user_id: string
  hearts: number // 0-3
}

export interface Comment {
  id: string
  trip_id: string
  wishlist_item_id: string | null
  activity_id: string | null
  task_id: string | null
  body: string
  created_by: string
  created_at: string
  edited_at: string | null
}
