import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from "react-i18next";

interface Props {
  hourlyData: any[];
}

export const WeatherChart: React.FC<Props> = ({ hourlyData }) => {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="chart-container" key={i18n.language}>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={hourlyData.filter((_, i) => i % 2 === 0)}>
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip 
            labelFormatter={() => t("chart_label")}
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', fontSize: '12px', color: '#fff' }} 
          />
          <Area type="monotone" dataKey="temp" stroke="var(--accent)" fill="url(#colorTemp)" strokeWidth={3} />
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-label">{t("chart_label")}</p>
    </div>
  );
};