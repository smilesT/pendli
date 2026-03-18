import type { ResolvedLocation, UserConfig } from '../../types/index.ts';
import { getTimeString } from './time-utils.ts';

export function getBaseLocation(
  time: Date,
  config: UserConfig
): ResolvedLocation {
  const day = time.getDay();
  const timeStr = getTimeString(time);
  const isWorkDay = config.workSchedule.days.includes(day);
  const isWorkTime =
    timeStr >= config.workSchedule.startTime &&
    timeStr <= config.workSchedule.endTime;

  return isWorkDay && isWorkTime ? config.workAddress : config.homeAddress;
}
