import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppService } from '../app.service';
import { FormGroup } from '@angular/forms';
import { AlertService, CloudAppConfigService, CloudAppRestService, CloudAppSettingsService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
import { Settings } from '../models/settings';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  loading = true;
  configForm: FormGroup = FormGroupUtil.toFormGroup(new Settings());

  constructor(
    private appService: AppService,
    private configService: CloudAppConfigService,
    private alert: AlertService,
    private router: Router
  ) { }

  ngOnInit() {
    this.configService.getAsFormGroup().subscribe(config => {
      if (Object.keys(config.value).length != 0) {
        this.configForm = config;
      }
    },
      err => {
        this.alert.error('Could not load settings');
      },
      () => {
        this.configForm.markAsPristine();
        this.loading = false;
      }
    );
  }

  back() {
    this.router.navigate(['']);
  }

  save() {
    this.loading = true;
    // Ensure that base urls end in / - applies to cover loader and resolver service
    for (let conf of ['cover_loader', 'resolver_service']) {
      if (!this.configForm.value['cover_loader'].endsWith('/')) {
        this.configForm.patchValue({ 'cover_loader': `${this.configForm.value['cover_loader']}/` });
      }
      if (!this.configForm.value['resolver_service'].endsWith('/')) {
        this.configForm.patchValue({ 'resolver_service': `${this.configForm.value['resolver_service']}/` });
      }
    }

    this.configService.set(this.configForm.value).subscribe(
      response => {
        this.alert.success('Configuration succesfully saved');
        this.configForm.markAsPristine();
      },
      err => {
        this.alert.error(err.message);
      },
      () => {
        this.loading = false;
      }
    );
  }
}
