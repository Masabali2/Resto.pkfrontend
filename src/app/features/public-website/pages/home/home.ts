import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Hero } from '../../components/hero/hero';
import { TemplateShowcase } from '../../components/template-showcase/template-showcase';
import { Features } from '../../components/features/features';
import { HowItWorks } from '../../components/how-it-works/how-it-works';
import { Testimonials } from '../../components/testimonials/testimonials';

import { Pricing } from '../../components/pricing/pricing';
import { Faq } from '../../components/faq/faq';
import { FinalCta } from '../../components/final-cta/final-cta';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [
    Navbar,
    Hero,
    TemplateShowcase,
    Features,
    HowItWorks,
    Testimonials,
    Pricing,
    Faq,
    FinalCta,
    Footer
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class PublicHome {}
