import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  Edit3,
  Upload,
  Building2,
  Calendar,
  ChevronDown,
} from "lucide-react";
import api from "../utils/api";

type LogItem = {
  id: number;
  dateTime: string;
  module: string;
  action: string;
  description: string;
  performedBy: string;
  performedByRole: string;
  targetUser: string;
  targetUserRole: string;
  targetUserId?: number | string;

};



const getStatusClass = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "Rejected":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    case "Updated":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
    case "Success":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getIcon = (status: string, module: string) => {
  if (status === "Approved") return <CheckCircle size={18} />;
  if (status === "Rejected") return <XCircle size={18} />;
  if (module.toLowerCase().includes("signature")) return <Upload size={18} />;
  if (module.toLowerCase().includes("department")) return <Building2 size={18} />;
  return <Edit3 size={18} />;
};

const getIconBoxClass = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400";
    case "Rejected":
      return "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400";
    case "Updated":
      return "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
    case "Success":
      return "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-600";
  }
};
const getPerformedByName = (log: LogItem) => {
  const performedBy = (log.performedBy || "").trim();
  const normalizedName = performedBy.toLowerCase();
  const normalizedRole = (log.performedByRole || "").toUpperCase();

  const isAdmin =
    normalizedRole === "HR_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedName === "admin" ||
    normalizedName === "admin@example.com" ||
    normalizedName.startsWith("system admin");

  return isAdmin ? "System Adminmmm" : performedBy || "—";
};
const LogFile = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("All");
  const [status, setStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/audit-logs");
        setLogs(res.data || []);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        log.module.toLowerCase().includes(searchText) ||
        log.action.toLowerCase().includes(searchText) ||
        log.description.toLowerCase().includes(searchText) ||
        log.performedBy.toLowerCase().includes(searchText) ||
        log.targetUser.toLowerCase().includes(searchText);

      const matchesAction =
        actionType === "All" ||
        log.module.toLowerCase().includes(actionType.toLowerCase());

      const matchesStatus =
        status === "All" ||
        log.action.toLowerCase().includes(status.toLowerCase());

      return matchesSearch && matchesAction && matchesStatus;
    });
  }, [logs, search, actionType, status]);
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const resetFilters = () => {
    setSearch("");
    setActionType("All");
    setStatus("All");
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in text-white">
      <div>
        <h1 className="text-3xl font-bold text-white">          Log File
        </h1>
        <p className="text-sm text-gray-400 mt-1">          Track all admin and manager actions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-brand-700/80 via-brand-800/80 to-brand-900/80 rounded-2xl border border-brand-500/30 shadow-lg shadow-brand-900/30 p-5">        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search logs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }} className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/10 text-sm text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand-400" />
        </div>

        <div className="relative">
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setCurrentPage(1);
            }} className="w-full appearance-none px-5 pr-12 py-3 rounded-xl border border-brand-400/30 bg-brand-800/80 text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-400 shadow-md"
          >
            <option className="bg-brand-900 text-white" value="All">Actions</option>

            <option className="bg-brand-900 text-white" value="Regularization">Regularization</option>
            <option className="bg-brand-900 text-white" value="Attendance">Attendance</option>
            <option className="bg-brand-900 text-white" value="Leave">Leave</option>
            <option className="bg-brand-900 text-white" value="Employee">Employee</option>
            <option className="bg-brand-900 text-white" value="Team">Team</option>
            <option className="bg-brand-900 text-white" value="Salary">Salary</option>
            <option className="bg-brand-900 text-white" value="Signature">Signature</option>
            <option className="bg-brand-900 text-white" value="Department">Department</option>
          </select>

          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/80"
          />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }} className="w-full appearance-none px-5 pr-12 py-3 rounded-xl border border-brand-500/40 bg-brand-800/80 text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-400 shadow-md"
          >
            <option className="bg-brand-900 text-white" value="All">Status</option>
            <option className="bg-brand-900 text-white" value="Approved">Approved</option>
            <option className="bg-brand-900 text-white" value="Rejected">Rejected</option>
            <option className="bg-brand-900 text-white" value="Updated">Updated</option>
          </select>

          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/80"
          />
        </div>

        <button
          onClick={resetFilters}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-brand-400/40 text-brand-200 hover:bg-white/10 transition"          >
          <RotateCcw size={17} />
          Reset Filters
        </button>
      </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-white/5">           <tr>
              <th className="text-center px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Action
              </th>
              <th className="text-left px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Performed By
              </th>
              <th className="text-left px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Employee / Entity
              </th>
              <th className="text-left px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Date & Time
              </th>
              <th className="text-left px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Status
              </th>
              <th className="text-left px-5 py-4 text-xs font-bold text-brand-100/70 uppercase">
                Description
              </th>

            </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"           >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconBoxClass(
                          log.action
                        )}`}
                      >
                        {getIcon(log.action, log.module)}                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">
                          {log.module} {log.action}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-200">
                    {getPerformedByName(log)}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-200">
                    {log.targetUserId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/employee/${log.targetUserId}`)}
                        className="text-left hover:text-white hover:underline underline-offset-4 transition-colors cursor-pointer"
                        title="View employee profile"
                      >
                        {log.targetUser || "—"}
                      </button>
                    ) : (
                      log.targetUser || "—"
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-200">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-gray-400" />
                      {log.dateTime}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusClass(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-gray-300">
                    <button
                      type="button"
                      onClick={() => setSelectedDescription(log.description)}
                      className="block w-full text-left truncate italic text-gray-300 hover:text-white hover:underline underline-offset-4 decoration-gray-400 hover:decoration-white transition-colors cursor-pointer"
                      title="Click to view full description"
                    >
                      {log.description || "—"}
                    </button>
                  </td>


                </tr>
              ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase">
              Rows per page
            </span>

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-5 py-2 bg-brand-800 hover:bg-brand-900 border border-brand-700 rounded-xl text-white font-bold cursor-pointer outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages || 1}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white disabled:opacity-40 hover:bg-brand-600 hover:text-white transition-all"
              >
                «
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white disabled:opacity-40 hover:bg-brand-600 hover:text-white transition-all"
              >
                ‹
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white disabled:opacity-40 hover:bg-brand-600 hover:text-white transition-all"
              >
                ›
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white disabled:opacity-40 hover:bg-brand-600 hover:text-white transition-all"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
      {selectedDescription && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setSelectedDescription(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-3xl bg-brand-900 border border-white/10 shadow-2xl p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Description</h2>

              <button
                type="button"
                onClick={() => setSelectedDescription(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl leading-none text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm leading-7 text-gray-200 break-words">
                {selectedDescription}
              </p>
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default LogFile;