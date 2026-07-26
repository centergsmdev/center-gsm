export type DemoUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
};
export type DemoAddress = {
  id: string;
  title: string;
  recipient: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  neighborhood: string;
  postalCode: string;
  isDefault: boolean;
};
export type NotificationPreferences = {
  email: boolean;
  sms: boolean;
  campaigns: boolean;
  orders: boolean;
};
