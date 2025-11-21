package com.communitymaps.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.communitymaps.models.*
import com.communitymaps.services.RetrofitClient
import com.communitymaps.viewmodels.MapViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddAlertDialog(
    viewModel: MapViewModel,
    onDismiss: () -> Unit
) {
    val categories by viewModel.categories.collectAsState()
    val mapCenter by viewModel.mapCenter.collectAsState()

    var category by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var severity by remember { mutableStateOf("medium") }
    var expanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Report New Alert") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Category Dropdown
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it }
                ) {
                    OutlinedTextField(
                        value = category.replaceFirstChar { it.uppercase() },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Category") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        categories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat.name) },
                                onClick = {
                                    category = cat.id
                                    expanded = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )

                // Severity
                Text("Severity", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("low", "medium", "high").forEach { level ->
                        FilterChip(
                            selected = severity == level,
                            onClick = { severity = level },
                            label = { Text(level.replaceFirstChar { it.uppercase() }) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (category.isNotEmpty()) {
                        viewModel.createAlert(
                            NewAlertRequest(
                                latitude = mapCenter.latitude,
                                longitude = mapCenter.longitude,
                                category = category,
                                description = description,
                                severity = severity,
                                photo = null
                            )
                        )
                        onDismiss()
                    }
                }
            ) {
                Text("Submit")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun AuthDialog(
    viewModel: MapViewModel,
    onDismiss: () -> Unit
) {
    var isLogin by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isLogin) "Login" else "Register") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Tab Toggle
                Row {
                    TextButton(
                        onClick = { isLogin = true },
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = if (isLogin) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurface
                        )
                    ) {
                        Text("Login")
                    }
                    TextButton(
                        onClick = { isLogin = false },
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = if (!isLogin) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurface
                        )
                    ) {
                        Text("Register")
                    }
                }

                if (!isLogin) {
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage.isNotEmpty()) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (isLogin) {
                        viewModel.login(
                            email = email,
                            password = password,
                            onSuccess = { onDismiss() },
                            onError = { errorMessage = it }
                        )
                    } else {
                        viewModel.register(
                            username = username,
                            email = email,
                            password = password,
                            onSuccess = { onDismiss() },
                            onError = { errorMessage = it }
                        )
                    }
                }
            ) {
                Text(if (isLogin) "Login" else "Register")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun StatsDialog(onDismiss: () -> Unit) {
    var stats by remember { mutableStateOf<Stats?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val response = RetrofitClient.apiService.getStats()
                if (response.isSuccessful) {
                    stats = response.body()
                }
            } catch (e: Exception) {
                // Handle error
            }
            isLoading = false
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Community Stats") },
        text = {
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                stats?.let { s ->
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                StatItem("Alerts", s.totalAlerts.toString())
                                StatItem("Users", s.totalUsers.toString())
                                StatItem("Comments", s.totalComments.toString())
                            }
                        }

                        item {
                            Text("By Category", style = MaterialTheme.typography.titleSmall)
                        }

                        items(s.byCategory) { cat ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(cat.category.replaceFirstChar { it.uppercase() })
                                Text(cat.count.toString())
                            }
                        }

                        item {
                            Text("Top Contributors", style = MaterialTheme.typography.titleSmall)
                        }

                        items(s.topContributors) { contributor ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(contributor.username)
                                Text("${contributor.alertCount} alerts")
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineMedium)
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
fun AlertDetailDialog(
    alert: Alert,
    canDelete: Boolean,
    onDismiss: () -> Unit,
    onUpvote: () -> Unit,
    onDelete: () -> Unit
) {
    var comments by remember { mutableStateOf<List<Comment>>(emptyList()) }
    var newComment by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(alert.id) {
        scope.launch {
            try {
                val response = RetrofitClient.apiService.getComments(alert.id)
                if (response.isSuccessful) {
                    comments = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(alert.category.replaceFirstChar { it.uppercase() }) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    alert.description?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        SeverityBadge(severity = alert.severity)
                        Text(
                            text = "${alert.upvotes} upvotes",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }

                    Divider(modifier = Modifier.padding(vertical = 8.dp))

                    Text("Comments", style = MaterialTheme.typography.titleSmall)
                }

                if (comments.isEmpty()) {
                    item {
                        Text(
                            "No comments yet",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                } else {
                    items(comments) { comment ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(
                                    comment.username,
                                    style = MaterialTheme.typography.labelSmall
                                )
                                Text(
                                    comment.content,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                }

                item {
                    OutlinedTextField(
                        value = newComment,
                        onValueChange = { newComment = it },
                        label = { Text("Add comment") },
                        modifier = Modifier.fillMaxWidth(),
                        trailingIcon = {
                            IconButton(
                                onClick = {
                                    if (newComment.isNotEmpty()) {
                                        scope.launch {
                                            try {
                                                val response = RetrofitClient.apiService.addComment(
                                                    alert.id,
                                                    CommentRequest(newComment, "Anonymous")
                                                )
                                                if (response.isSuccessful) {
                                                    response.body()?.let {
                                                        comments = comments + it
                                                        newComment = ""
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                // Handle error
                                            }
                                        }
                                    }
                                }
                            ) {
                                Icon(Icons.Default.Send, "Send")
                            }
                        }
                    )
                }
            }
        },
        confirmButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onUpvote) {
                    Icon(Icons.Default.ThumbUp, "Upvote")
                    Text(" Upvote")
                }
                if (canDelete) {
                    Button(
                        onClick = onDelete,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(Icons.Default.Delete, "Delete")
                    }
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
