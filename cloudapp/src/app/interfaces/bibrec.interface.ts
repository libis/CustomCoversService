export interface BibRec{
    mms_id: string;
    mms_id_NZ?: string;
    mms_id_CZ?: string;
    CZ: boolean;
    linked_record_id: any;
    title: string;
    author?: string;
    place_of_publication?: string;
    publisher_const?: string;
    date_of_publication?: string;
    link?:string;
    anies: any;
    parsed_rec: Document;
}

export interface LinkedID{
    value: string;
    type: string;
}

export interface BibIdentifiers{
    mmsid: string;
    isbn?: string[];
    issn?: string[];
    ean?: string[];
}

export interface BibCovers{
    curr_IDs: {[key:string]:string[]};
    active_IDs: {[key:string]:string[]};
}