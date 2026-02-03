import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostingSheetComponent } from './costing-sheet.component';

describe('CostingSheetComponent', () => {
  let component: CostingSheetComponent;
  let fixture: ComponentFixture<CostingSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostingSheetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CostingSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
