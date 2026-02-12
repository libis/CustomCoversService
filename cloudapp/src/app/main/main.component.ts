import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  signal,
  ElementRef,
  ViewChild,
} from "@angular/core";
import {
  CloudAppRestService,
  CloudAppEventsService,
  AlertService,
  CloudAppConfigService,
} from "@exlibris/exl-cloudapp-angular-lib";
import { AppService } from "../app.service";
import { RecService } from "../rec.service";
import { CoverService } from "../cover.service";
import { TranslateService } from "@ngx-translate/core";
import {
  BibRec,
  BibCovers,
  BibIdentifiers,
} from "../interfaces/bibrec.interface";
import { Settings } from "../models/settings";
import { Cover } from "../models/cover";
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialog,
} from "@angular/material/dialog";
import { CoverRec } from "../interfaces/cover.interface";

@Component({
  selector: "app-main",
  templateUrl: "./main.component.html",
  styleUrls: ["./main.component.scss"],
})
export class MainComponent implements OnInit, OnDestroy {
  // Flow
  loading: boolean = false;
  update: boolean = false;
  covers_loaded: boolean = false;

  // Settings
  inst: string = "";
  config: Settings = new Settings();
  authToken: string = "";
  user: any = {};

  // Record related data
  mmsID: string = "";
  bibRec: BibRec | null = null;
  bib_ids: BibIdentifiers = { mmsid: "" };
  limo_link: string = "";

  // Covers data
  currCovers: { [key: string]: CoverRec[] } = {};
  bibCovers: BibCovers = {
    curr_IDs: {},
    active_IDs: {},
  };

  // file upload
  @ViewChild("fileInput") fileInput: ElementRef | undefined;
  coverFile: File | null = null;
  imageName = signal("");
  fileSize = signal(0);
  imagePreview = signal("");
  selectedFile: File | null = null;

  constructor(
    private appService: AppService,
    private alert: AlertService,
    private restService: CloudAppRestService,
    private eventService: CloudAppEventsService,
    private configService: CloudAppConfigService,
    private recService: RecService,
    private coverService: CoverService,
    private translate: TranslateService,
    private dialog: MatDialog
  ) {}

  // Initialize - loads environment variables and settings
  ngOnInit() {
    // Load general Alma config
    this.restService.call<any>("/almaws/v1/conf/general").subscribe(
      (genConfig) => {
        this.inst = genConfig.institution.value;
      },
      (err) => {
        console.log(
          "An error occurred while retrieving institution settings: " +
            err.message
        );
      }
    );

    // Generate JWT token for cover server authentication
    this.eventService
      .getAuthToken()
      .subscribe((authToken) => (this.authToken = authToken));

    // Collect current config settings
    this.configService.get().subscribe(
      (conf) => {
        this.config = conf;
      },
      (err) => {
        console.log(
          "An error occurred while loading app configuration: " + err.message
        );
      }
    );

    // Collect loggedin user
    this.restService.call<any>("/almaws/v1/users/ME").subscribe(
      (user) => {
        this.user = user;
        this.translate.use(this.user.preferred_language.value);
      },
      (err) => {
        console.log("Could not retrieve user data: " + err.message);
      }
    );
  }

  // After input of bib MMS ID, collect bib record - includes additional parsing and calculations
  loadBibRecord() {
    //("Entering loadBibRecord with MMS ID: ", this.mmsID);
    this.loading = true;
    this.alert.clear();

    this.recService.getRecByMMS(this.mmsID).subscribe(
      (bib) => {
        // Collect and process bib record
        this.processBibRecord(bib);
        // Trigger call to collect available covers
        this.getCoverOverview();  
      },
      (error) => {
        this.alert.error(
          this.translate.instant("Translate.error.alma_not_found"),
          { autoClose: false }
        );
        this.loading = false;
      },
      () => {
        this.loading = false;
      }
    );
  }

  // Method to parse bibrecord after load - triggered upon each refresh of the Alma record
  processBibRecord(bib: BibRec): void {
    this.bibRec = this.recService.parseBibRecord(bib);

    if (this.bibRec != null) {
      // Extract standard identifiers from bib rec
      this.bib_ids = this.recService.extractIdentifiers(this.bibRec);

      // Calculate Discovery view link
      this.limo_link = this.config.view_url.replace(
        "[rec_id]",
        this.mmsID
      );

      // Extract list of current covers metadata
      this.bibCovers = this.recService.extract_cover_IDs(this.bibRec);
    }
  }

  // Method to clear current bib record and related data
  clear_bibrec() {
    this.mmsID = "";
    this.bibRec = null;
    this.bib_ids = { mmsid: "" };
    this.limo_link = "";
    this.update = false;
    this.covers_loaded = false;
    this.currCovers = {};
    this.bibCovers = {
      curr_IDs: {},
      active_IDs: {},
    };
  }

  // Method to collect all covers currently available for the record
  getCoverOverview() {
    this.loading = true;
    this.coverService.getAllCovers(this.bib_ids).subscribe(
      (covers) => {
        this.currCovers = {};
        let coverset = covers[0].data;

        // For each cover, load cover in list of current covers
        for (const cover of coverset) {
          let parsed_cover: CoverRec = {
            source: cover.source,
            id_type: cover.id_type,
            id_code: cover.base_id,
            cover_code: cover.id_code,
            is_active: true,
          };
          parsed_cover.cover_url = `${this.config.resolver_service}${cover.id_code}/thumbnail?set=${cover.source}&inst=${this.config.resolver_key}&from_cache=0`;

          if (!(cover.source in this.currCovers)) {
            this.currCovers[cover.source] = [parsed_cover];
          } else {
            this.currCovers[cover.source].push(parsed_cover);
          }
        }
        this.covers_loaded = true;
        // Check if record update is needed
        this.checkRecUpdate();
      },
      (err) => {
        this.covers_loaded = false;
        //console.log("Cover list loading failed");
        this.loading = false;
        console.log(err);
      },
      () => {
        this.loading = false;
      }
    );
  }

  // Methods to manage coverserver controlfields in the Alma record
  // Method to check if cover control fields need to be updated in the bib record
  checkRecUpdate(): void {
    //console.log("Entering checkRecUpdate");
    this.loading = true;
    let update_rec = false;
    let activated: { [key: string]: string[] } = {};

    // Collect activated cover IDs
    for (const source in this.currCovers) {
      activated[source] = new Array<string>();
      for (let cover of this.currCovers[source]) {
        if (cover["is_active"] == true) {
          activated[source].push(
            `${cover["id_type"].split("/")[0].toUpperCase()}${cover["id_code"]}`
          );
        }
      }
    }

    // Verify LIBISnet cover status
    if ("covers" in this.bibCovers.active_IDs && !("covers" in this.currCovers)) {
      update_rec = true;
    }

    // Verify if list of active IDs matches current activation settings (only sources present in currCovers are taken into account)
    for (const source in activated) {
      // Check if source is present in active IDs. If not, trigger update
      if (source in this.bibCovers.active_IDs) {
        // Check if all activated IDs are in list of active IDs
        for (const cover_id of activated[source]) {
          if (!this.bibCovers.active_IDs[source].includes(cover_id)) {
            update_rec = true;
          }
        }
        // Check if all active IDs are in the list of activated IDs
        for (const cover_id of this.bibCovers.active_IDs[source]) {
          if (!activated[source].includes(cover_id)) {
            update_rec = true;
          }
        }
      } else {
        update_rec = true;
      }
    }

    //console.log("Update needed: ", update_rec);
    if (update_rec == true && this.bibRec != null) {
      //console.log("Proceeding with record update");
      let recID: string =
        this.bibRec.mms_id_NZ != undefined && this.bibRec.mms_id_NZ != ""
          ? this.bibRec.mms_id_NZ
          : this.bibRec.mms_id;
      this.coverService
        .updateRecord(this.authToken, recID, activated)
        .subscribe(
          (bib) => {
            this.alert.success(
              this.translate.instant("Translate.msg.alma_update")
            );
            this.processBibRecord(bib);
          },
          (err) => {
            this.alert.error(
              this.translate.instant("Translate.error.alma_update")
            );
            this.loading = false;
          },
          () => {
            this.loading = false;         
          }
        );
    }
    else { 

      this.loading = false; }
  }

  // Methods to handle file input in the UI
  // Handler for file input selection
  onCoverSelected(event: Event): void {
    const coverInput = event.target as HTMLInputElement;
    if (coverInput.files && coverInput.files.length > 0) {
      this.coverFile = coverInput.files[0];
      this.loadPreview();
    }
  }

  // Handler for file preview
  loadPreview() {
    //("Selected file: ", this.coverFile);
    if (this.coverFile && this.coverFile.type.startsWith("image/")) {
      this.fileSize.set(Math.round(this.coverFile.size / 1024)); // Set file size in KB
      if (this.coverFile.size / Math.pow(1024, 2) < 1) {
        const fReader = new FileReader();
        fReader.onload = (e) => {
          this.imagePreview.set(e.target?.result as string);
        };
        fReader.readAsDataURL(this.coverFile);
        this.imageName.set(this.coverFile.name);
      } else {
        this.alert.error(
          this.translate.instant("Translate.error.cover_too_large"),
          { autoClose: false }
        );
        this.removeImage();
      }
    } else {
      this.alert.warn(this.translate.instant("Translate.warn.not_image"));
    }
  }

  // Method to reset cover file
  removeImage(): void {
    this.coverFile = null;
    this.imageName.set("");
    this.fileSize.set(0);
    this.imagePreview.set("");
    this.selectedFile = null;
  }

  // Method to upload a new cover
  uploadCover(): void {
    // Coverfile check - this should in principle never be triggered, but the null check is required to avoid typescript warning
    if (!this.coverFile) {
      this.alert.error(this.translate.instant("Translate.error.no_selection"));
      return;
    }

    if (this.bibRec != null) {
      //console.log('Starting file upload');
      this.loading = true;
      let recID: string =
        this.bibRec.mms_id_NZ != undefined && this.bibRec.mms_id_NZ != ""
          ? this.bibRec.mms_id_NZ
          : this.bibRec.mms_id;
      //console.log("Sending cover with mms id: ", recID);
      const newCover = new Cover(this.coverFile, "mmsid", recID);

      this.coverService.uploadCover(newCover, this.authToken).subscribe(
        (response) => {
          this.alert.success(this.translate.instant("Translate.msg.new_cover"));
          this.getCoverOverview();
        },
        (err) => {
          this.alert.error(this.translate.instant("Translate.error.new_cover"));
          this.loading = false;
        },
        () => {
          this.removeImage();
          this.loading = false;
        }
      );
    }
  }

  // Method to delete existing covers (only for local covers)
  deleteCover(id_type: string, id_code: string) {
    this.loading = true;
    this.coverService.deleteCover(id_type, id_code, this.authToken).subscribe(
      (resp) => {
        this.alert.success(
          this.translate.instant("Translate.msg.delete_cover")
        );
        this.getCoverOverview();
        //delete this.currCovers["covers"];
      },
      (err) => {
        this.alert.error(
          this.translate.instant("Translate.error.delete_cover")
        );
        this.loading = false;
      }
    );
  }

  // General reset
  reset() {
    // Reset flow variables
    this.loading = false;

    // Reset record data
    this.clear_bibrec();

    // Clear upload zone
    this.removeImage();
  }

  ngOnDestroy(): void {}

  // Popup dialog methods
  // Cover full view popup (cover overview)
  showFullCover(cover: any) {
    const dialogRef = this.dialog.open(FullCoverDialog, {
      data: { currentCover: cover.cover_url },
    });
  }

  // Overwrite confirmation (cover upload)
  newCover(): void {
    // Check if there is already a LIBISnet cover
    if ("covers" in this.currCovers) {
      //console.log("There is a cover already - doing overwrite check before loading")
      const dialogRef = this.dialog.open(OverwriteConfirmationDialog, {
        data: { currentCover: this.currCovers["covers"][0].cover_url },
      });
      dialogRef.afterClosed().subscribe(
        (confirm) => {
          if (confirm == true) {
            this.uploadCover();
          } else {
            this.alert.warn(
              this.translate.instant("Translate.warn.cancel_cover_upload")
            );
          }
        },
        (err) => {
          this.alert.error(this.translate.instant("Translate.error.new_cover"));
        }
      );
    } else {
      //console.log("There is no cover yet - uploading cover without check");
      this.uploadCover();
    }
  }

  checkDeleteCover(currCover: any) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialog, {
      data: { currentCover: currCover.cover_url },
    });
    dialogRef.afterClosed().subscribe(
      (confirm) => {
        if (confirm == true) {
          this.deleteCover(currCover.id_type, currCover.id_code);
        } else {
          this.alert.warn(
            this.translate.instant("Translate.warn.cancel_cover_delete")
          );
        }
      },
      (err) => {
        this.alert.error(
          this.translate.instant("Translate.error.delete_cover")
        );
      }
    );
  }
}

@Component({
  selector: "overwrite-confirm",
  templateUrl: "./confirm_overwrite.component.html",
  styleUrls: ["./main.component.scss"],
})
export class OverwriteConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<OverwriteConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { currentCover: string }
  ) {}
}

@Component({
  selector: "full-cover",
  templateUrl: "./fullcover.component.html",
  styleUrls: ["./main.component.scss"],
})
export class FullCoverDialog {
  constructor(
    public dialogRef: MatDialogRef<FullCoverDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { currentCover: string }
  ) {}
}

@Component({
  selector: "delete-confirm",
  templateUrl: "./confirm_delete.component.html",
  styleUrls: ["./main.component.scss"],
})
export class DeleteConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { currentCover: string }
  ) {}
}
