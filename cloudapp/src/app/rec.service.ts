// imports
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CloudAppRestService, Request, HttpMethod
} from '@exlibris/exl-cloudapp-angular-lib';
import { Item } from './interfaces/item.interface';
import { BibRec, BibIdentifiers, BibCovers } from './interfaces/bibrec.interface';

@Injectable({
  providedIn: 'root'
})

export class RecService {

  constructor(private restService: CloudAppRestService) { }

  // *** Section 0: Methods to load initial config ***

  // NOTE: Current setup of this service does not require loading config

  // *** Section 1: General supporting methods - used to perform action on (parts of) the record

  // Isbn10 to Isbn13 convertor - Returns equivalent Isbn13. If the input ID is invalid, returns null.
  isbn10to13(isbn: string): string | null {
    // Remove characters not allowed in isbn13 (punctuation, non-digit characters other than x/X) and spaces
    isbn = isbn.trim()
    isbn = isbn.replace(/[^\dx]*/gi, '');
    // If isbn has exactly 10 characters, convert to isbn13
    if (isbn.length == 10) {
      let sum = 0;
      isbn = `978${isbn.slice(0, -1)}`;
      for (let i = 0; i < isbn.length; i++) {
        i % 2 == 0 ? sum += parseInt(isbn[i]) : sum += parseInt(isbn[i]) * 3;
      }
      isbn = `${isbn}${sum % 10 == 0 ? 0 : 10 - sum % 10}`;
    }
    // If resulting isbn does not consist of exactly 13 digits after processing, return null
    if (!isbn.match(/^\d{13}$/)) {
      return null;
    }
    return isbn
  }

  // *** Section 2: Methods to collect (parts of) records from Alma - 'GET' ***

  // Find Alma record by item barcode - currently not used
  getItemByBarcode(barcode: string): Observable<Item> {

    const request: Request = {
      url: `/almaws/v1/items?item_barcode=${encodeURI(barcode)}`,
      method: HttpMethod.GET
    };
    return this.restService.call(request);
  }

  // Find Alma record by MMS ID
  getRecByMMS(MMSid: string): Observable<BibRec> {
    const request: Request = {
      url: `/bibs/${encodeURI(MMSid)}`,
      method: HttpMethod.GET
    };
    return this.restService.call(request);
  }

  // Collect CZ version of MMS ID - if not present, the local MMS ID will be used
  getMMSid_CZ(bib: BibRec): string {

    // Check if the bib record has a linked CZ ID
    // If no CZ ID is found, an empty string is returned
       if (Array.isArray(bib.linked_record_id) == false) {
        bib.linked_record_id = [bib.linked_record_id];
      }
      let CZ_id = bib.linked_record_id.filter((bibid: any) => bibid.type == 'CZ');
      if (CZ_id.length > 0) {
        return CZ_id[0].value;
      }
          
    return '';
  }

  // Collect NZ version of MMS ID - if not present, the local MMS ID will be used
  getMMSid_NZ(bib: BibRec): string {

    // Verify if NZ MMS id has been input. If not, try to collect NZ MMS ID from linked_record_id
    // If no NZ MMS ID is found, an empty string is returned
    if (bib.mms_id.endsWith('1471') == false) {
      if (Array.isArray(bib.linked_record_id) == false) {
        bib.linked_record_id = [bib.linked_record_id];
      }
      let NZ_id = bib.linked_record_id.filter((bibid: any) => bibid.type == 'NZ');
      if (NZ_id.length > 0) {
        return NZ_id[0].value;
      }
      else {
        return '';
      }
    }
    // Else, the input MMS ID is already a NZ MMS ID, so it is returned unchanged
    else {
      return bib.mms_id;
    }
  }

  // Section 4: Methods to create/update Alma records - 'PUT'/'POST'

  // Request update for active covers in Alma record - currently not used
  // setCoversActive(bibrec:BibRec, coverCodes:any):void{
  //   // create new xml field
  //   const new921 = bibrec.parsed_rec.createElement('datafield');
  //   new921.setAttribute('ind1','1');
  //   new921.setAttribute('ind2',' ');
  //   new921.setAttribute('tag','900');
  //   const newS921 = bibrec.parsed_rec.createElement('subfield');
  //   newS921.setAttribute('code','a');
  //   const newText = bibrec.parsed_rec.createTextNode("COVERSERVER_TEST");
  //   newS921.appendChild(newText)
  //   new921.appendChild(newS921);
  //   bibrec.parsed_rec.documentElement.appendChild(new921);
  // }

  // Update alma record - currently not used
  // updateRec(bibrec:BibRec):Observable<any>{
  //   const request: Request = {
  //     url: `/bibs/${encodeURI(bibrec.mms_id)}`,
  //     headers: {
  //       "Content-Type":"application/xml",
  //       Accept: "Application/json"
  //     },
  //     requestBody: `<bib>${new XMLSerializer().serializeToString(bibrec.parsed_rec)}</bib>`,
  //     method: HttpMethod.PUT
  //   };
  //   return this.restService.call(request);
  // }

  // Method to collect standard identifiers from bib record - currently includes mmsid, isbn, issn and ean
  extractIdentifiers(bib: BibRec): BibIdentifiers {
    // Create empty object to hold bib identifiers
    let bibIds = { 'mmsid': '', 'isbn': new Array<string>(), 'issn': new Array<any>(), 'ean': new Array<string>() };
  if (bib.mms_id_NZ != null && bib.mms_id_NZ != '') {
      bibIds.mmsid = bib.mms_id_NZ;
    }
    else {
      bibIds.mmsid = bib.mms_id;
    }
    
    // Collect standard identifiers from xml record
    const xmlrec = bib.parsed_rec;

    // Collect isbn
    const isbn = xmlrec.evaluate('//datafield[@tag="020"]/subfield[@code="a"]', xmlrec, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let isbn_elem = isbn.iterateNext();
    while (isbn_elem) {
      if (isbn_elem.textContent != null) {
        let isbn13 = this.isbn10to13(isbn_elem.textContent);
        if (isbn13 != null && !bibIds.isbn.includes(isbn13)) {
          bibIds.isbn.push(isbn13);
        }
      }
      isbn_elem = isbn.iterateNext();
    }

    // Collect issn
    const issn = xmlrec.evaluate('//datafield[@tag="022"]/subfield[@code="a"]', xmlrec, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let issn_elem = issn.iterateNext();
    while (issn_elem) {
      if (issn_elem.textContent != null) {
        bibIds.issn.push(issn_elem.textContent);
      }
      issn_elem = issn.iterateNext();
    }

    // Collect ean
    const ean = xmlrec.evaluate('//datafield[@tag="024"]/subfield[@code="a" and @ind1="3"]', xmlrec, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let ean_elem = ean.iterateNext();
    while (ean_elem) {
      if (ean_elem.textContent != null) {
        let ean13 = this.isbn10to13(ean_elem.textContent);
        if (ean13 != null && !bibIds.ean.includes(ean13)) {
          bibIds.ean.push(ean13);
        }
      }
      ean_elem = ean.iterateNext();
    }

    return bibIds;
  }

  // Collect cover IDs currently available in bib record - a distinction is made between available and activated IDs
  extract_cover_IDs(bibrec: BibRec): BibCovers {
    let covers = {
      'curr_IDs': {},
      'active_IDs': {},
      'available_IDs': {},
    } as BibCovers;

    const xmlrec = bibrec.parsed_rec;
    // Collect all fields 921
    const all_metadata = xmlrec.evaluate('//datafield[@tag="921"]', xmlrec, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    // Process all fields 921 separately
    for (let i = 0; i < all_metadata.snapshotLength; i++) {
      let node = all_metadata.snapshotItem(i) as Element;

      if (node) {
        let source_code = xmlrec.evaluate('subfield[@code="2"]', node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        let source = "";
        if (source_code != null && source_code.textContent != null) {
          source = source_code.textContent.toLowerCase();
        }
        let all_covers = xmlrec.evaluate('subfield[@code="c"]', node, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        // Check if the field is a coverserver controlfield (source indicator 'CVR')
        if (source == 'cvr') {

          // Collect all selected IDs
          for (let i = 0; i < all_covers.snapshotLength; i++) {
            let cover = all_covers.snapshotItem(i);
            if (cover != null && cover.textContent != null) {
              const cover_metadata = Array.from(cover.textContent.matchAll(/\((.*?)\)(.*)/g));
              if (cover_metadata[0] && cover_metadata[0].length == 3){
              let cover_source = cover_metadata[0][1];
              let ID_code = cover_metadata[0][2];
              if (!(cover_source in covers.active_IDs)) {
                covers.active_IDs[cover_source] = new Array<string>;
              }
              if (!covers.active_IDs[cover_source].includes(cover.textContent)) {
                covers.active_IDs[cover_source].push(ID_code);
              }
            }
            }
          }
        }
        else if (source != "") {
          for (let i = 0; i < all_covers.snapshotLength; i++) {
            let cover = all_covers.snapshotItem(i);
            if (cover != null && cover.textContent != null) {

              if (!(source in covers.curr_IDs)) {
                covers.curr_IDs[source] = new Array<string>;
              }
              if (!covers.curr_IDs[source].includes(cover.textContent)) {
                covers.curr_IDs[source].push(cover.textContent);
              }
            }
          }
        }
      }
    }
    return covers;
  }
}







