import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusquedaMirador } from './busqueda-mirador';

describe('BusquedaMirador', () => {
  let component: BusquedaMirador;
  let fixture: ComponentFixture<BusquedaMirador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusquedaMirador],
    }).compileComponents();

    fixture = TestBed.createComponent(BusquedaMirador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
