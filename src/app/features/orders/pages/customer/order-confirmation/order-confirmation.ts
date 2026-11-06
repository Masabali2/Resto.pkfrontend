import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';

@Component({selector:'app-public-order-confirmation',standalone:true,imports:[RouterLink,PublicOrderFrame],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./order-confirmation.html',styleUrl:'./order-confirmation.css'})
export class PublicOrderConfirmation {}
