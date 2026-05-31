"use client"

import { useState, useEffect } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { ProjectService } from "@/lib/projects/project-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Clock, Plus, User, Mail } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ApprovalWorkflow, ApprovalStep } from "@/lib/projects/types"
import { useSession } from "next-auth/react"

interface ApprovalWorkflowProps {
  projectId: string
}

export function ApprovalWorkflowComponent({ projectId }: ApprovalWorkflowProps) {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const { getWorkflow, setWorkflow } = useProjectStore()
  const projectService = new ProjectService()
  const [workflow, setWorkflowState] = useState<ApprovalWorkflow | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadWorkflow()
  }, [projectId])

  const loadWorkflow = async () => {
    try {
      const wf = await projectService.getWorkflow(projectId)
      setWorkflowState(wf)
      if (wf) {
        setWorkflow(projectId, wf)
      }
    } catch (error) {
      console.error("Error loading workflow:", error)
    }
  }

  const handleCreateWorkflow = async (name: string, steps: Omit<ApprovalStep, "id" | "status" | "completedAt" | "notifiedAt">[]) => {
    try {
      setLoading(true)
      const wf = await projectService.createWorkflow(projectId, {
        name,
        steps: steps.map((step, index) => ({
          ...step,
          id: `step-${Date.now()}-${index}`,
          status: "pending" as const,
        })),
        currentStepIndex: 0,
        status: "pending",
      })
      setWorkflowState(wf)
      setWorkflow(projectId, wf)
    } catch (error) {
      console.error("Error creating workflow:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveStep = async (stepId: string, approved: boolean, comments?: string) => {
    try {
      setLoading(true)
      const updated = await projectService.approveStep(projectId, stepId, approved, comments)
      setWorkflowState(updated)
      setWorkflow(projectId, updated)
    } catch (error) {
      console.error("Error approving step:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "سير عمل الموافقة" : "Approval Workflow"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === "ar" ? "إنشاء سير عمل" : "Create Workflow"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {language === "ar" ? "إنشاء سير عمل الموافقة" : "Create Approval Workflow"}
                </DialogTitle>
              </DialogHeader>
              <CreateWorkflowForm onSubmit={handleCreateWorkflow} loading={loading} />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {language === "ar" ? "سير عمل الموافقة" : "Approval Workflow"}
          </CardTitle>
          <Badge
            variant={
              workflow.status === "approved"
                ? "default"
                : workflow.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {workflow.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {workflow.steps.map((step, index) => {
            const isCurrent = index === workflow.currentStepIndex
            const canApprove = isCurrent && step.approverId === session?.user?.id

            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border ${
                  isCurrent ? "border-emerald-500 bg-emerald-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{step.order}. {step.name}</span>
                      {step.required && (
                        <Badge variant="outline" className="text-xs">
                          {language === "ar" ? "مطلوب" : "Required"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <User className="h-4 w-4" />
                      <span>{step.approverName}</span>
                      <Mail className="h-4 w-4 ml-2" />
                      <span>{step.approverEmail}</span>
                    </div>
                    {step.status === "approved" && step.comments && (
                      <p className="text-sm text-slate-600 mt-2">{step.comments}</p>
                    )}
                    {step.status === "rejected" && step.comments && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>{step.comments}</AlertDescription>
                      </Alert>
                    )}
                    {step.deadline && (
                      <p className="text-xs text-slate-500 mt-1">
                        {language === "ar" ? "الموعد النهائي" : "Deadline"}: {new Date(step.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {step.status === "pending" && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {language === "ar" ? "في الانتظار" : "Pending"}
                      </Badge>
                    )}
                    {step.status === "approved" && (
                      <Badge className="bg-emerald-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {language === "ar" ? "موافق" : "Approved"}
                      </Badge>
                    )}
                    {step.status === "rejected" && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {language === "ar" ? "مرفوض" : "Rejected"}
                      </Badge>
                    )}
                    {canApprove && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveStep(step.id, true)}
                          disabled={loading}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {language === "ar" ? "موافق" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const comments = prompt(language === "ar" ? "سبب الرفض" : "Rejection reason")
                            if (comments) {
                              handleApproveStep(step.id, false, comments)
                            }
                          }}
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {language === "ar" ? "رفض" : "Reject"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function CreateWorkflowForm({
  onSubmit,
  loading,
}: {
  onSubmit: (name: string, steps: Omit<ApprovalStep, "id" | "status" | "completedAt" | "notifiedAt">[]) => void
  loading: boolean
}) {
  const { language } = useLanguage()
  const [name, setName] = useState("")
  const [steps, setSteps] = useState<Array<{ name: string; approverId: string; approverName: string; approverEmail: string; required: boolean; deadline?: string }>>([
    { name: "", approverId: "", approverName: "", approverEmail: "", required: true },
  ])

  const handleAddStep = () => {
    setSteps([...steps, { name: "", approverId: "", approverName: "", approverEmail: "", required: true }])
  }

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validSteps = steps
      .map((step, index) => ({
        ...step,
        order: index + 1,
      }))
      .filter((step) => step.name && step.approverId)
    onSubmit(name.trim() || "Approval Workflow", validSteps)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "اسم سير العمل" : "Workflow Name"}
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={language === "ar" ? "سير عمل الموافقة" : "Approval Workflow"}
        />
      </div>

      <div className="space-y-3">
        <Label>
          {language === "ar" ? "خطوات الموافقة" : "Approval Steps"}
        </Label>
        {steps.map((step, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {language === "ar" ? "خطوة" : "Step"} {index + 1}
              </span>
              {steps.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStep(index)}
                >
                  {language === "ar" ? "حذف" : "Remove"}
                </Button>
              )}
            </div>
            <Input
              value={step.name}
              onChange={(e) => {
                const newSteps = [...steps]
                newSteps[index].name = e.target.value
                setSteps(newSteps)
              }}
              placeholder={language === "ar" ? "اسم الخطوة" : "Step name"}
              required
            />
            <Input
              value={step.approverName}
              onChange={(e) => {
                const newSteps = [...steps]
                newSteps[index].approverName = e.target.value
                setSteps(newSteps)
              }}
              placeholder={language === "ar" ? "اسم الموافق" : "Approver name"}
              required
            />
            <Input
              type="email"
              value={step.approverEmail}
              onChange={(e) => {
                const newSteps = [...steps]
                newSteps[index].approverEmail = e.target.value
                setSteps(newSteps)
              }}
              placeholder={language === "ar" ? "بريد الموافق" : "Approver email"}
              required
            />
            <Input
              value={step.approverId}
              onChange={(e) => {
                const newSteps = [...steps]
                newSteps[index].approverId = e.target.value
                setSteps(newSteps)
              }}
              placeholder={language === "ar" ? "معرّف الموافق" : "Approver ID"}
              required
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAddStep}>
          <Plus className="h-4 w-4 mr-2" />
          {language === "ar" ? "إضافة خطوة" : "Add Step"}
        </Button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ الإنشاء..."
            : "Creating..."
          : language === "ar"
            ? "إنشاء"
            : "Create"}
      </Button>
    </form>
  )
}

