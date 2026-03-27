import { Routes } from '@angular/router';
import { Home } from './miradores/home/home';
import { DetalleMirador } from './miradores/pages/detalle-mirador/detalle-mirador';

export const routes: Routes = [
   { path: '',redirectTo:'/home',pathMatch:'full'},
    { path: 'home', component: Home },
    { path: 'miradores/:id', component: DetalleMirador },
];
