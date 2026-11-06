import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';

@Component({selector:'app-public-checkout',standalone:true,imports:[PublicOrderFrame],changeDetection:ChangeDetectionStrategy.OnPush,templateUrl:'./checkout.html',styleUrl:'./checkout.css'})
export class PublicCheckout {}
