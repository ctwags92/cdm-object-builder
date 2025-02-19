import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { BuilderComponent } from '../builder/builder.component';
import { NodeDatabaseService } from '../../services/node-database.service';
import { NodeSelectionService } from '../../services/node-selection.service';
import { NodeDatabaseServiceMock } from '../../mocks/node-database.service.mock';
import { NodeSelectionServiceMock } from '../../mocks/node-selection.service.mock';

import { BreadcrumbComponent } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BreadcrumbComponent],
      providers: [
        { provide: NodeDatabaseService, useClass: NodeDatabaseServiceMock },
        { provide: NodeSelectionService, useClass: NodeSelectionServiceMock },
        { provide: BuilderComponent, useValue: {
          expandNode: () => {}
        }}
      ],
      imports: [MatSnackBarModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
