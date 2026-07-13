import { motion } from 'framer-motion';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onCreateSchedule: () => void;
}

export default function LandingPage({ onCreateSchedule }: LandingPageProps) {
  const floatingIcons = [
    { Icon: Calendar, delay: 0, x: -20, y: -30 },
    { Icon: Users, delay: 0.2, x: 20, y: -20 },
    { Icon: Clock, delay: 0.4, x: -30, y: 20 },
    { Icon: TrendingUp, delay: 0.6, x: 30, y: 30 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </motion.div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            Grafiki
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Zespołu Sprzedaży
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Optymalizuj wydajność zespołu dzięki inteligentnym grafikom
          </p>
        </motion.div>

        <div className="relative mb-16">
          {floatingIcons.map(({ Icon, delay, x, y }, index) => (
            <motion.div
              key={index}
              className="absolute"
              style={{ left: '50%', top: '50%' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: 1,
                x: [0, x, 0],
                y: [0, y, 0],
              }}
              transition={{
                opacity: { duration: 3, repeat: Infinity, delay },
                scale: { duration: 0.5, delay },
                x: { duration: 4, repeat: Infinity, delay },
                y: { duration: 4, repeat: Infinity, delay },
              }}
            >
              <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-slate-600">
                <Icon className="w-8 h-8 text-blue-400" />
              </div>
            </motion.div>
          ))}

          <motion.button
            onClick={onCreateSchedule}
            className="relative z-20 px-12 py-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xl font-semibold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="relative z-10">Utwórz Grafik</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {[
            {
              icon: Calendar,
              title: 'Inteligentne Planowanie',
              description: 'Automatyczne generowanie grafików na podstawie popytu',
            },
            {
              icon: Users,
              title: 'Zarządzanie Zespołem',
              description: 'Efektywne zarządzanie zespołem sprzedaży',
            },
            {
              icon: TrendingUp,
              title: 'Analityka Wydajności',
              description: 'Śledź i optymalizuj produktywność zespołu',
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center"
              whileHover={{ y: -5, borderColor: 'rgb(96, 165, 250)' }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}