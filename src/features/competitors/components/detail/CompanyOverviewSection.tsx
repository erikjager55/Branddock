"use client";

import { Building2, Calendar, MapPin, Users } from "lucide-react";
import { Input } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface CompanyOverviewSectionProps {
  competitor: CompetitorDetail;
  isEditing: boolean;
  editName: string;
  setEditName: (v: string) => void;
  editTagline: string;
  setEditTagline: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editFoundingYear: string;
  setEditFoundingYear: (v: string) => void;
  editHeadquarters: string;
  setEditHeadquarters: (v: string) => void;
  editEmployeeRange: string;
  setEditEmployeeRange: (v: string) => void;
}

/** Company overview section with description, founding year, HQ, employees */
export function CompanyOverviewSection({
  competitor,
  isEditing,
  editName,
  setEditName,
  editTagline,
  setEditTagline,
  editDescription,
  setEditDescription,
  editFoundingYear,
  setEditFoundingYear,
  editHeadquarters,
  setEditHeadquarters,
  editEmployeeRange,
  setEditEmployeeRange,
}: CompanyOverviewSectionProps) {
  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          Company Overview
        </h3>
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Tagline" value={editTagline} onChange={(e) => setEditTagline(e.target.value)} placeholder="Short tagline..." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              placeholder="Company description..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Founded" value={editFoundingYear} onChange={(e) => setEditFoundingYear(e.target.value)} placeholder="e.g. 2015" />
            <Input label="Headquarters" value={editHeadquarters} onChange={(e) => setEditHeadquarters(e.target.value)} placeholder="e.g. Amsterdam" />
            <Input label="Employees" value={editEmployeeRange} onChange={(e) => setEditEmployeeRange(e.target.value)} placeholder="e.g. 50-200" />
          </div>
        </div>
      </div>
    );
  }

  const hasMetadata = competitor.foundingYear || competitor.headquarters || competitor.employeeRange;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        Company Overview
      </h3>

      {competitor.description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {competitor.description}
        </p>
      )}

      {hasMetadata && (
        <div className="flex flex-wrap gap-4">
          {competitor.foundingYear && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              Founded {competitor.foundingYear}
            </div>
          )}
          {competitor.headquarters && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              {competitor.headquarters}
            </div>
          )}
          {competitor.employeeRange && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users className="h-4 w-4 text-gray-400" />
              {competitor.employeeRange} employees
            </div>
          )}
        </div>
      )}

      {!competitor.description && !hasMetadata && (
        <p className="text-sm text-gray-400 italic">No company information available yet.</p>
      )}
    </div>
  );
}
