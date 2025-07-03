import { Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppSettingsService, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';

import { Settings } from '../models/settings';

@Component({
  selector: 'app-cover-loader',
  standalone: true,
  imports: [],
  templateUrl: './cover-loader.component.html',
  styleUrl: './cover-loader.component.scss'
})
export class CoverLoaderComponent implements OnInit, OnDestroy {

  constructor(private settingsService: CloudAppSettingsService,
    private restService: CloudAppRestService
  ){}

  loading: boolean = false
  config = new Settings();

  ngOnInit() {
    this.settingsService.get().subscribe(conf => {
      this.config.coverLoader = conf.coverLoader;
      this.config.instCode = conf.instCode;
    },
      err => {
        console.log(err);
      },
      () =>{
        console.log('Finished loading institution settings');
      }
    );
  }

  ngOnDestroy() {
  }

}
