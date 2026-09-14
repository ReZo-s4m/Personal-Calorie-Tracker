/**
 * Wall-clock time as a collaborator, mirroring IDateTimeUtils in
 * provisioning_service. Injecting it lets a test freeze "now" instead of
 * writing assertions that drift with the calendar.
 */
export interface IClock {
  now(): Date;
}

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}

/** Test double: always reports the instant it was built with. */
export class FixedClock implements IClock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant);
  }
}
