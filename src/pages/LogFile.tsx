
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  ChevronDown,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

const getStatusBadge = (status: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("approved") || normalized.includes("success")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#E4F5EC] text-[#1F8A5A]">
        Approved
      </span>
    );
  }
  if (normalized.includes("rejected")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#FBE7E7] text-[#C13A3A]">
        Rejected
      </span>
    );
  }
  if (normalized.includes("created") || normalized.includes("added")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#E8ECFC] text-[#2C4FD6]">
        Created
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-medium bg-[#E8ECFC] text-[#2C4FD6]">
      Updated
    </span>
  );
};

const getActionIcon = (actionStr: string) => {
  const normalized = (actionStr || "").toLowerCase();
  if (normalized.includes("approved") || normalized.includes("success")) {
    return (
      <span className="w-[26px] h-[26px] rounded-[6px] bg-[#E4F5EC] text-[#1F8A5A] flex items-center justify-center shrink-0">
        <CheckCircle size={14} />
      </span>
    );
  }
  if (normalized.includes("rejected")) {
    return (
      <span className="w-[26px] h-[26px] rounded-[6px] bg-[#FBE7E7] text-[#C13A3A] flex items-center justify-center shrink-0">
        <XCircle size={14} />
      </span>
    );
  }
  return (
    <span className="w-[26px] h-[26px] rounded-[6px] bg-[#E8ECFC] text-[#2C4FD6] flex items-center justify-center shrink-0">
      <User size={14} />
    </span>
  );
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

  return isAdmin ? "SystemAdmin" : performedBy || "—";
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
        (log.module || "").toLowerCase().includes(searchText) ||
        (log.action || "").toLowerCase().includes(searchText) ||
        (log.description || "").toLowerCase().includes(searchText) ||
        (log.performedBy || "").toLowerCase().includes(searchText) ||
        (log.targetUser || "").toLowerCase().includes(searchText);

      const matchesAction =
        actionType === "All" ||
        (log.module || "").toLowerCase().includes(actionType.toLowerCase());

      const matchesStatus =
        status === "All" ||
        (log.action || "").toLowerCase().includes(status.toLowerCase());

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
    <div className="animate-fade-in-up pb-8">

      {/* Header + Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">

        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">
            Log File
          </h2>

          <p className="text-sm text-[#5B6472] dark:text-gray-400">
            Track all admin and manager actions.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">

          {/* Search Input */}
          <div className="relative w-full sm:w-[340px] group">
            <div className="relative flex items-center search">
              <Search
                size={15}
                className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors"
              />

              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
              />
            </div>
          </div>

          {/* Actions Filter */}
          <div className="relative h-[36px]">
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-full appearance-none pl-3 pr-8 py-[9px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-[13px] font-medium text-[#5B6472] dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="All">Actions</option>
              <option value="Regularization">Regularization</option>
              <option value="Attendance">Attendance</option>
              <option value="Leave">Leave</option>
              <option value="Employee">Employee</option>
              <option value="Team">Team</option>
              <option value="Salary">Salary</option>
              <option value="Department">Department</option>
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA3B1]"
            />
          </div>

          {/* Status Filter */}
          <div className="relative h-[36px]">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-full appearance-none pl-3 pr-8 py-[9px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-[13px] font-medium text-[#5B6472] dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="All">Status</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Updated">Updated</option>
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA3B1]"
            />
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={resetFilters}
            className="h-[36px] flex items-center justify-center gap-1.5 px-3 py-[9px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <RotateCcw
              size={14}
              className="text-[#9AA3B1]"
            />

            <span>Reset Filters</span>
          </button>

        </div>
      </div>

      {/* Your Log File Table / Rest of your content goes here */}



      {/* Logs Table Card */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 border-b border-[#E2E6ED] dark:border-gray-800">
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  ACTION
                </th>
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  PERFORMED BY
                </th>
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  EMPLOYEE / ENTITY
                </th>
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  DATE & TIME
                </th>
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  STATUS
                </th>
                <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">
                  DESCRIPTION
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-xs font-medium text-[#9AA3B1]">
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#F7F8FA]/60 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Action Column */}
                    <td className="py-[13px] px-[22px]">
                      <div className="flex items-center gap-2.5 log-action h-[26px]">
                        {getActionIcon(log.action)}
                        <span className="font-semibold text-[13.5px] text-[#12151C] dark:text-white">
                          {log.action}
                        </span>
                      </div>
                    </td>

                    {/* Performed By Column */}
                    <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#12151C] dark:text-white">
                      {getPerformedByName(log)}
                    </td>

                    {/* Employee / Entity Column */}
                    <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#12151C] dark:text-white">
                      {log.targetUserId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/employee/${log.targetUserId}`)}
                          className="text-left hover:text-[#2C4FD6] hover:underline transition-colors cursor-pointer"
                          title="View employee profile"
                        >
                          {log.targetUser || "—"}
                        </button>
                      ) : (
                        log.targetUser || "—"
                      )}
                    </td>

                    {/* Date & Time Column */}
                    <td className="py-[13px] px-[22px] text-[11.5px] font-normal text-[#717E95] dark:text-gray-400 font-mono-numbers">
                      {log.dateTime}
                    </td>

                    {/* Status Column */}
                    <td className="py-[13px] px-[22px]">
                      {getStatusBadge(log.action)}
                    </td>

                    {/* Description Column */}
                    <td className="py-[13px] px-[22px] text-[11.5px] font-normal text-[#717E95] dark:text-gray-400">
                      <button
                        type="button"
                        onClick={() => setSelectedDescription(log.description)}
                        className="block max-w-[280px] text-left truncate hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to view description"
                      >
                        {log.description || "—"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-xs font-semibold text-[#9AA3B1]">
                    No logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-5 py-3 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA]/50 dark:bg-gray-800/20">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#9AA3B1] uppercase tracking-wider">
              Rows per page:
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-xs font-bold text-[#12151C] dark:text-white cursor-pointer outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5B6472] dark:text-gray-400">
              Page {currentPage} of {totalPages || 1}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 text-[#12151C] dark:text-white disabled:opacity-30 hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={15} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 text-[#12151C] dark:text-white disabled:opacity-30 hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={15} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 text-[#12151C] dark:text-white disabled:opacity-30 hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={15} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 text-[#12151C] dark:text-white disabled:opacity-30 hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={15} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description Modal */}
      {selectedDescription && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDescription(null)}
        >
          <div
            className="w-full max-w-md rounded-[6px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 p-6 text-[#12151C] dark:text-white animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Log Description</h3>
              <button
                type="button"
                onClick={() => setSelectedDescription(null)}
                className="w-7 h-7 rounded-full hover:bg-[#F7F8FA] dark:hover:bg-white/10 flex items-center justify-center text-lg text-[#9AA3B1] hover:text-[#12151C]"
              >
                ×
              </button>
            </div>

            <div className="rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-gray-800/50 p-4">
              <p className="text-xs leading-relaxed text-[#5B6472] dark:text-gray-300 break-words">
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