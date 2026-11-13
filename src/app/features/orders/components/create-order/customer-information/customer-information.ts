import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

export interface CustomerInformationData {
  customerName: string;
  phone: string;
  email: string;
  specialInstructions: string;
}

const DEFAULT_CUSTOMER_INFORMATION: CustomerInformationData = {
  customerName: '',
  phone: '',
  email: '',
  specialInstructions: ''
};

@Component({
  selector: 'app-customer-information',
  standalone: true,
  templateUrl: './customer-information.html',
  styleUrl: './customer-information.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerInformation {
  readonly customer = input<CustomerInformationData>(
    DEFAULT_CUSTOMER_INFORMATION
  );

  readonly customerChange =
    output<CustomerInformationData>();

  readonly nameMaxLength = 150;
  readonly phoneMaxLength = 30;
  readonly emailMaxLength = 254;
  readonly instructionsMaxLength = 2000;

  readonly nameLength = computed(
    () => this.customer().customerName.length
  );

  readonly instructionsLength = computed(
    () => this.customer().specialInstructions.length
  );

  protected getValue(event: Event): string {
    const target = event.target;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return target.value;
    }

    return '';
  }

  protected updateField(
    field: keyof CustomerInformationData,
    value: string
  ): void {
    this.customerChange.emit({
      ...this.customer(),
      [field]: value
    });
  }

  protected updateName(value: string): void {
    this.updateField('customerName', value);
  }

  protected updatePhone(value: string): void {
    this.updateField('phone', value);
  }

  protected updateEmail(value: string): void {
    this.updateField('email', value);
  }

  protected updateInstructions(value: string): void {
    this.updateField(
      'specialInstructions',
      value
    );
  }
}