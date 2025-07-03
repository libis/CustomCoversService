import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverLoaderComponent } from './cover-loader.component';

describe('CoverLoaderComponent', () => {
  let component: CoverLoaderComponent;
  let fixture: ComponentFixture<CoverLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
