import { useState, useEffect } from 'react';

// TypeScript Interfaces
interface CoachStats {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  activeClients: number;
  activePhases: number;
  requirementCompletionRate: number;
  dailyCheckParticipationRate: number;
  missedChecks: number;
  flags: {
    red: number;
    yellow: number;
    green: number;
  };
  flagEscalations: {
    escalatedFrom: number;
    escalatedTo: number;
  };
  uploadedVideos: number;
  leads: {
    open: number;
    closed: number;
  };
  averageSurveyRating: number;
  absences: {
    URLAUB: number;
    KRANKHEIT: number;
    ANDERES: number;
  };
}

interface ApiResponse {
  success: boolean;
  data: CoachStats[];
  error?: string;
}

export default function CoachStats() {
  const [coaches, setCoaches] = useState<CoachStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string>('all');

  useEffect(() => {
    const fetchCoachStats = async () => {
      try {
        const response = await fetch('/api/admin/coach-stats');
        const data: ApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch coach statistics');
        }

        setCoaches(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCoachStats();
  }, []);

  const filteredCoaches = selectedCoach === 'all' 
    ? coaches 
    : coaches.filter(coach => coach.id === selectedCoach);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Coach Statistics Dashboard</h1>
      
      {/* Coach Filter */}
      <div className="mb-6">
        <select 
          className="form-select rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          value={selectedCoach}
          onChange={(e) => setSelectedCoach(e.target.value)}
        >
          <option value="all">All Coaches</option>
          {coaches.map(coach => (
            <option key={coach.id} value={coach.id}>{coach.name}</option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCoaches.map(coach => (
          <div key={coach.id} className="bg-white rounded-lg shadow-lg p-6">
            {/* Coach Info */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">{coach.name}</h2>
              <p className="text-gray-600">{coach.email}</p>
              <p className="text-gray-600">{coach.mobileNumber}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Active Clients</p>
                <p className="text-xl font-semibold">{coach.activeClients}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Active Phases</p>
                <p className="text-xl font-semibold">{coach.activePhases}</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Requirement Completion</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${coach.requirementCompletionRate}%` }}
                  ></div>
                </div>
                <p className="text-right text-sm">{coach.requirementCompletionRate}%</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Daily Check Participation</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${coach.dailyCheckParticipationRate}%` }}
                  ></div>
                </div>
                <p className="text-right text-sm">{coach.dailyCheckParticipationRate}%</p>
              </div>
            </div>

            {/* Flags */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Flags</h3>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span>{coach.flags.red}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span>{coach.flags.yellow}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>{coach.flags.green}</span>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="mt-6 space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">Missed Checks:</span> {coach.missedChecks}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Videos Uploaded:</span> {coach.uploadedVideos}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Leads:</span> {coach.leads.open} open, {coach.leads.closed} closed
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Avg. Rating:</span> {coach.averageSurveyRating.toFixed(1)} / 5
              </p>
            </div>

            {/* Absences */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Absences</h3>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-gray-500">Vacation:</span> {coach.absences.URLAUB} days
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Sick Leave:</span> {coach.absences.KRANKHEIT} days
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Other:</span> {coach.absences.ANDERES} days
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
