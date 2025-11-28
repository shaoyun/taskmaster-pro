import { Holiday } from '../types';

const BASE_URL = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master';

export const holidayService = {
    async getHolidays(year: number): Promise<Holiday[]> {
        try {
            const response = await fetch(`${BASE_URL}/${year}.json`);
            if (!response.ok) {
                throw new Error('Failed to fetch holidays');
            }
            const data = await response.json();
            return data.days.map((d: any) => ({
                name: d.name,
                date: d.date,
                isOffDay: d.isOffDay
            }));
        } catch (error) {
            console.error('Error fetching holidays:', error);
            return [];
        }
    }
};
