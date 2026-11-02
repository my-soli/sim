// Server-only module: kept separate from api.ts purely to keep the client-facing functions
// (checkout/orders/esims pages import those) in their own file, independent of this one.
import { send, type Country, type Plan } from "./api";

export const getCountries = () => send<Country[]>("GET", "/catalog/countries");

export const getPlans = (code: string) => send<Plan[]>("GET", `/catalog/countries/${code}/packages`);
