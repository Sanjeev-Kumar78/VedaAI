export const API_BASE_URL = "";
export const WS_BASE_URL = "";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const mapStatus = (status: string) => {
  if (status === "queued") return "pending";
  if (status === "generating") return "processing";
  return status; // completed, failed
};

export async function fetchAssignments(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assignments`);
    if (!res.ok) {
      throw new Error(`Failed to fetch assignments: ${res.statusText}`);
    }
    const result = await res.json();
    const rawList = result.assignments || [];
    return rawList.map((asg: any) => ({
      ...asg,
      _id: asg._id,
      id: asg._id,
      dueDate: asg.dueDate,
      createdAt: asg.createdAt,
      status: mapStatus(asg.status),
    }));
  } catch (error) {
    console.error("fetchAssignments error:", error);
    return [];
  }
}

export async function fetchAssignmentDetails(id: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch assignment details: ${res.statusText}`);
    }
    const result = await res.json();
    const asg = result.assignment || null;
    if (asg) {
      // Map grade to gradeLevel for frontend form consistency
      const computedTotalMarks = asg.result?.totalMarks || (asg.questionConfig || []).reduce((sum: number, c: any) => sum + (c.count * c.marks), 0);
      return {
        ...asg,
        _id: asg._id,
        id: asg._id,
        totalMarks: computedTotalMarks,
        gradeLevel: asg.grade,
        status: mapStatus(asg.status),
      };
    }
    return null;
  } catch (error) {
    console.error("fetchAssignmentDetails error:", error);
    return null;
  }
}

export async function createAssignment(formData: FormData): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
  try {
    const title = formData.get("title") as string;
    const subject = formData.get("subject") as string;
    const gradeLevel = formData.get("gradeLevel") as string;
    const dueDateRaw = formData.get("dueDate") as string;
    const additionalInstructions = formData.get("additionalInstructions") as string;

    // Convert dueDate to a valid ISO datetime string for Zod .datetime() validation
    let dueDate = new Date().toISOString();
    if (dueDateRaw) {
      const parsedDate = new Date(dueDateRaw);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString();
      }
    }

    // Read the uploaded file if present
    let sourceText = "";
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      sourceText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }

    // Map frontend config array to backend questionConfig
    const configRaw = formData.get("questionConfig") as string;
    let questionConfig = [];
    if (configRaw) {
      questionConfig = JSON.parse(configRaw).map((row: any) => ({
        type: row.type,
        count: Number(row.count),
        marks: Number(row.marks),
      }));
    }

    // Reconstruct body strictly as JSON matching createAssignmentSchema
    const payload = {
      title,
      subject,
      grade: gradeLevel, // map gradeLevel -> grade
      dueDate,
      questionConfig,
      additionalInstructions: additionalInstructions || undefined,
      sourceText: sourceText || undefined,
    };

    const res = await fetch(`${API_BASE_URL}/api/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.message || data.error || "Failed to create assignment" };
    }

    return {
      success: true,
      assignmentId: data.assignmentId,
    };
  } catch (error: any) {
    console.error("createAssignment error:", error);
    return { success: false, error: error.message || "Network error occurred while creating assignment" };
  }
}

export async function downloadPDF(
  assignmentId: string,
  title: string,
  withAnswerKey: boolean = false,
  keptQuestionNumbers?: number[]
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/results/${assignmentId}/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ withAnswerKey, keptQuestionNumbers }),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate PDF: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = title || "assignment";
    const keySuffix = withAnswerKey ? "_with_answers" : "";
    a.download = `${safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}${keySuffix}_assessment.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error("downloadPDF error:", error);
    return false;
  }
}

export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete assignment: ${res.statusText}`);
    }
    const result = await res.json();
    return result.success;
  } catch (error) {
    console.error("deleteAssignment error:", error);
    return false;
  }
}

export async function regenerateAssignment(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/assignments/${id}/regenerate`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to regenerate assignment: ${res.statusText}`);
    }
    const result = await res.json();
    return result.success;
  } catch (error) {
    console.error("regenerateAssignment error:", error);
    return false;
  }
}
