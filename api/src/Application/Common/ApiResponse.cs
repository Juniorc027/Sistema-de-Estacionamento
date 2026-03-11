namespace ParkingSystem.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public IEnumerable<string>? Errors { get; set; }
    public int StatusCode { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Operação realizada com sucesso.")
        => new() { Success = true, Message = message, Data = data, StatusCode = 200 };

    public static ApiResponse<T> Created(T data, string message = "Recurso criado com sucesso.")
        => new() { Success = true, Message = message, Data = data, StatusCode = 201 };

    public static ApiResponse<T> Fail(string message, int statusCode = 400, IEnumerable<string>? errors = null)
        => new() { Success = false, Message = message, StatusCode = statusCode, Errors = errors };

    public static ApiResponse<T> NotFound(string message = "Recurso não encontrado.")
        => new() { Success = false, Message = message, StatusCode = 404 };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string message = "Operação realizada com sucesso.")
        => new() { Success = true, Message = message, StatusCode = 200 };

    public static new ApiResponse Fail(string message, int statusCode = 400, IEnumerable<string>? errors = null)
        => new() { Success = false, Message = message, StatusCode = statusCode, Errors = errors };
}
