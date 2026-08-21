package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/SA/Golang-Backend-Example/internal/utils"
)

// FileController is the single local-disk upload endpoint every module's
// "attach a file" feature (Portfolio, Application.DocumentURL,
// MatchResult.ProofImageURL, PaymentEvidence) posts to first. It just saves
// the file under UploadDir and hands back the served path — the caller then
// puts that path into whichever record it belongs to.
type FileController struct {
	UploadDir string
}

func NewFileController(uploadDir string) *FileController {
	return &FileController{UploadDir: uploadDir}
}

// Upload saves a multipart "file" field to disk and returns its served path
// (served statically at /uploads/... — see routes.go).
func (fc *FileController) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.JSONError(c, http.StatusBadRequest, "no file provided", err.Error())
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	destination := filepath.Join(fc.UploadDir, filename)

	if err := c.SaveUploadedFile(file, destination); err != nil {
		utils.JSONError(c, http.StatusInternalServerError, "failed to save file", err.Error())
		return
	}

	utils.JSONSuccess(c, http.StatusCreated, gin.H{
		"file_name": file.Filename,
		"file_type": filepath.Ext(file.Filename),
		"file_size": file.Size,
		"file_path": "/uploads/" + filename,
	})
}
