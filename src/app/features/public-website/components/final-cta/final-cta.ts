import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-final-cta',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './final-cta.html',
  styleUrl: './final-cta.css'
})
export class FinalCta {}
