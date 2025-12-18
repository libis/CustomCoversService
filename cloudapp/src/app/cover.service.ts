import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, delay, retry, retryWhen, scan } from 'rxjs/operators';
import { BibRec, BibIdentifiers } from './interfaces/bibrec.interface';
import { Cover } from './models/cover';
import { Settings } from './models/settings';

import { CloudAppRestService, CloudAppConfigService } from '@exlibris/exl-cloudapp-angular-lib';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class CoverService {

  config: Settings = new Settings();
  inst: { "full": string, "tenant": string, "inst": string } = { "full": "", "tenant": "", "inst": "" };

  constructor(private restService: CloudAppRestService,
    private configService: CloudAppConfigService,
    private http: HttpClient
  ) {
    //console.log('Starting oninit of coverservice')
    // Load general Alma config
    this.restService.call<any>("/almaws/v1/conf/general").subscribe(
      genConfig => {
        // Load and parse institution code
        this.inst.full = genConfig.institution.value;
        const inst_codes = Array.from(this.inst.full.matchAll(/(.*)_(.*)/g))[0];
        this.inst.tenant = inst_codes[1];
        this.inst.inst = inst_codes[2];
        //console.log('Finished loading settings: ', this.inst);
      },
      err => {
        console.error("An error occurred while loading config");
      }
    );

    // Load coverserver configuration
    this.configService.get().subscribe(conf => {
      this.config = conf;
    },
      err => {
      console.error("An error occurred while loading config");
      }
    );
  }

  // Method to collect a single cover by id - uses resolver service
  getCover(cover: any): Observable<any> {
    const url = `${this.config.resolver_service}${cover.id_code}/thumbnail?set=${cover.source}&inst=${this.config.resolver_key};`
    return this.http.get(url).pipe(
          retryWhen((errors) =>
            errors.pipe(
              scan((retryCount, error) => {
                let errorValue = typeof error === "function" ? error() : error;
                console.log(`Error encountered: ${errorValue.status} - ${errorValue.message}`);
                if (retryCount >= 3) {
                  console.log("Max retries reached. Throwing error.");
                  throw error;
                } else if (errorValue.status < 500) {
                  console.log("Error not eligible for retry. Throwing error.");
                  throw error;
                }
                console.log(`Retrying... Attempt #${retryCount + 1}`);
                return retryCount + 1;
              }, 0),
              delay(2000))
            )
        );    
    /*.pipe(
      retry(3),
      catchError((error) => {
        console.error('Error fetching covers:', error);
        return throwError(() => new Error('Failed to fetch covers from resolver service'));
      })  
    );*/
  }

  // Method to collect complete set of available covers for a given record - uses resolver service
  getAllCovers(bib_ids: BibIdentifiers): Observable<any> {

    // Filter out empty arrays
    let id_set_filtered = Object.fromEntries(
      Object.entries(bib_ids).filter(([k, v]) => v.length > 0))
    //console.log('Filtered ID set: ', id_set_filtered);

    // Collect covers overview from resolver service
    let url = `${this.config.resolver_service}search?query=${JSON.stringify(id_set_filtered)}&set=covers&inst=${this.config.resolver_key}`;
    //console.log('url: ', encodeURI(url));

    return this.http.get(url).pipe(
          retryWhen((errors) =>
            errors.pipe(
              scan((retryCount, error) => {
                let errorValue = typeof error === "function" ? error() : error;
                console.log(`Error encountered: ${errorValue.status} - ${errorValue.message}`);
                if (retryCount >= 3) {
                  console.log("Max retries reached. Throwing error.");
                  throw error;
                } else if (errorValue.status < 500) {
                  console.log("Error not eligible for retry. Throwing error.");
                  throw error;
                }
                console.log(`Retrying... Attempt #${retryCount + 1}`);
                return retryCount + 1;
              }, 0),
              delay(2000))
            )
        );
    
    /*.pipe(
      retry(3),
      catchError((error) => {
        console.error('Error fetching covers:', error);
        return throwError(() => new Error('Failed to fetch covers from resolver service'));
      })  
    );*/
  }

  // Method to delete existing cover - uses coverserver API
  deleteCover(id_type: string, id_code: string, authToken: string): Observable<any> {
    const url = `${this.config.cover_loader}${this.inst.tenant}/${this.inst.full}`;
    //('Delete URL: ', url);

    // Compile call options parameters
    const options = {
      'headers': new HttpHeaders({
        'Authorization': `${authToken}`
      }),
      'params': {
        'type': id_type,
        'code': id_code
      }
    }

    // Return call promise
    return this.http.delete(url, options);
  }

  // Method to upload new cover - uses coverserver API
  uploadCover(cover: Cover, authToken: string): Observable<any> {

    // Generate upload url
    const url = `${this.config.cover_loader}${this.inst.tenant}/${this.inst.full}`;

    // Compile call body
    const coverData = new FormData();
    coverData.append('cover', cover.cover);
    coverData.append('type', cover.type);
    coverData.append('code', cover.code);

    // Compile call options parameters
    const options = {
      'headers': {
        'Authorization': `${authToken}`
      }
    }

    // Return call promise
    return this.http.post(url, coverData, options);
  }

  updateRecord(authToken: string, mmsid: string, coverSet: any): Observable<BibRec> {
    const url = `${this.config.record_service}`;
    //console.log('Update URL:', url);

    const recData = new FormData();
    recData.append('mmsid', mmsid);
    recData.append('coverset', JSON.stringify(coverSet));

    const options = {
      'headers': {
        'Authorization': `Bearer ${authToken}`
      }
    }

    return this.http.post<BibRec>(url, recData, options);
  }
}
