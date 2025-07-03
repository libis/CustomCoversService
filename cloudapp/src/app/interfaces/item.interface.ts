export interface Item {
    bib_data: BibData
    holding_data?: HoldingData
    item_data?: ItemData
    link: string
  }
  
  export interface BibData {
    title: string
    author?: string
    isbn?: string
    mms_id: string
    bib_suppress_from_publishing?: string
    complete_edition?: string
    network_number?: string[]
    place_of_publication?: string
    date_of_publication?: string
    publisher_const?: string
    link?: string
  }
  
  export interface HoldingData {
    holding_id: string
    holding_suppress_from_publishing?: string
    calculated_suppress_from_publishing?: string
    permanent_call_number_type?: PermanentCallNumberType
    permanent_call_number?: string
    call_number_type?: CallNumberType
    call_number?: string
    accession_number?: string
    copy_id?: string
    in_temp_location?: boolean
    temp_library?: TempLibrary
    temp_location?: TempLocation
    temp_call_number_type?: TempCallNumberType
    temp_call_number?: string
    temp_call_number_source?: string
    temp_policy?: TempPolicy
    link?: string
  }
  
  export interface PermanentCallNumberType {
    value: string
    desc: string
  }
  
  export interface CallNumberType {
    value: string
    desc: string
  }
  
  export interface TempLibrary {}
  
  export interface TempLocation {}
  
  export interface TempCallNumberType {
    value: string
  }
  
  export interface TempPolicy {
    value: string
  }
  
  export interface ItemData {
    pid: string
    barcode?: string
    policy?: Policy
    provenance?: Provenance
    description?: string
    library?: Library
    location?: Location
    pages?: string
    pieces?: string
    requested?: boolean
    creation_date?: string
    modification_date?: string
    base_status?: BaseStatus
    awaiting_reshelving?: boolean
    physical_material_type?: PhysicalMaterialType
    po_line?: string
    is_magnetic?: boolean
    year_of_issue?: string
    enumeration_a?: string
    enumeration_b?: string
    enumeration_c?: string
    enumeration_d?: string
    enumeration_e?: string
    enumeration_f?: string
    enumeration_g?: string
    enumeration_h?: string
    chronology_i?: string
    chronology_j?: string
    chronology_k?: string
    chronology_l?: string
    chronology_m?: string
    break_indicator?: BreakIndicator
    pattern_type?: PatternType
    linking_number?: string
    type_of_unit?: string
    receiving_operator?: string
    process_type?: ProcessType
    inventory_number?: string
    inventory_price?: string
    alternative_call_number?: string
    alternative_call_number_type?: AlternativeCallNumberType
    storage_location_id?: string
    public_note?: string
    fulfillment_note?: string
    internal_note_1?: string
    internal_note_2?: string
    internal_note_3?: string
    statistics_note_1?: string
    statistics_note_2?: string
    statistics_note_3?: string
    physical_condition?: PhysicalCondition
    committed_to_retain?: CommittedToRetain
    retention_reason?: RetentionReason
    retention_note?: string
  }
  
  export interface Policy {
    value: string
  }
  
  export interface Provenance {
    value: string
  }
  
  export interface Library {
    value: string
    desc: string
  }
  
  export interface Location {
    value: string
    desc: string
  }
  
  export interface BaseStatus {
    value: string
    desc: string
  }
  
  export interface PhysicalMaterialType {
    value: string
    desc: string
  }
  
  export interface BreakIndicator {
    value: string
  }
  
  export interface PatternType {
    value: string
  }
  
  export interface ProcessType {
    value: string
  }
  
  export interface AlternativeCallNumberType {
    value: string
  }
  
  export interface PhysicalCondition {}
  
  export interface CommittedToRetain {}
  
  export interface RetentionReason {
    value: string
  }
  